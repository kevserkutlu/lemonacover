// Ürün videosunu siteye hazırlar (scripts/fotolar.mjs çağırır; elle çalıştırmaya gerek yok).
//
//   swift video-hazirla.swift <girdi.mov> <çıktı-taban> [uzun-kenar=1920]
//
// Üç dosya yazar:
//   <taban>.mp4        HEVC (H.265), yüksek bit hızı — Safari, iPhone, çoğu Chrome
//   <taban>-h264.mp4   H.264, daha da yüksek bit hızı — HEVC oynatamayan tarayıcılar için
//   <taban>-kapak.png  videonun ilk karelerinden kapak görseli
//
// Simlerin parıltısı kaybolmasın diye bit hızı, sitelerin genelde kullandığının birkaç
// katı (1080p'de ~11 Mbps HEVC, ~19 Mbps H.264). Ses kaldırılır (oda sesi, konuşma
// sitede istenmez). iPhone'un HDR videoları her ekranda doğru görünsün diye standart
// renge (SDR, Rec. 709) çevrilir; telefonun döndürme bilgisi uygulanır.

import AVFoundation
import CoreImage
import Foundation
import ImageIO
import VideoToolbox
import UniformTypeIdentifiers

func fail(_ msg: String) -> Never {
  FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
  exit(1)
}

let args = CommandLine.arguments
guard args.count >= 3 else { fail("kullanım: video-hazirla.swift <girdi> <çıktı-taban> [uzun-kenar]") }
let input = URL(fileURLWithPath: args[1])
let base = args[2]
let maxSide = args.count > 3 ? (Double(args[3]) ?? 1920) : 1920

let asset = AVURLAsset(url: input)
guard let track = try await asset.loadTracks(withMediaType: .video).first else { fail("videoda görüntü yok: \(input.path)") }
let natural = try await track.load(.naturalSize)
let transform = try await track.load(.preferredTransform)
let sourceFps = try await track.load(.nominalFrameRate)
// 30 kare/sn yeter (parıltı akıcı görünür); 60'lık videolar yarı boyuta iner
let fps = max(1, min(30, sourceFps > 0 ? sourceFps : 30))
let duration = try await asset.load(.duration)

// döndürülmüş (dik) boyut ve küçültme
let upright = natural.applying(transform)
let (uw, uh) = (abs(upright.width), abs(upright.height))
let scale = min(1, maxSide / max(uw, uh))
// kodlayıcılar çift sayı ister
let outW = Int((uw * scale / 2).rounded()) * 2
let outH = Int((uh * scale / 2).rounded()) * 2

/// Videoyu tek kodekle baştan kodlar. Kareler AVVideoComposition'dan geçer: döndürme
/// uygulanır, HDR → SDR (Rec. 709) çevrilir, istenen boyuta küçültülür.
func encode(codec: AVVideoCodecType, bitsPerPixel: Double, to out: URL) async throws {
  try? FileManager.default.removeItem(at: out)

  let composition = try await AVMutableVideoComposition.videoComposition(withPropertiesOf: asset)
  composition.renderSize = CGSize(width: outW, height: outH)
  composition.frameDuration = CMTime(value: 1, timescale: CMTimeScale(fps.rounded()))
  composition.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
  composition.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
  composition.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2
  // döndürme + küçültme tek dönüşümde
  let instruction = AVMutableVideoCompositionInstruction()
  instruction.timeRange = CMTimeRange(start: .zero, duration: duration)
  let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
  var t = transform
  // dönüşüm sonrası görüntü (0,0)'dan başlasın
  let bounds = CGRect(origin: .zero, size: natural).applying(transform)
  t = t.concatenating(CGAffineTransform(translationX: -bounds.minX, y: -bounds.minY))
  t = t.concatenating(CGAffineTransform(scaleX: CGFloat(outW) / uw, y: CGFloat(outH) / uh))
  layer.setTransform(t, at: .zero)
  instruction.layerInstructions = [layer]
  composition.instructions = [instruction]

  let reader = try AVAssetReader(asset: asset)
  let output = AVAssetReaderVideoCompositionOutput(videoTracks: [track], videoSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
  ])
  output.videoComposition = composition
  output.alwaysCopiesSampleData = false
  reader.add(output)

  let bitrate = min(40_000_000, Double(outW * outH) * Double(fps) * bitsPerPixel)
  let writer = try AVAssetWriter(outputURL: out, fileType: .mp4)
  writer.shouldOptimizeForNetworkUse = true // oynatma indirme bitmeden başlasın
  var compression: [String: Any] = [
    AVVideoAverageBitRateKey: Int(bitrate),
    AVVideoExpectedSourceFrameRateKey: Int(fps.rounded()),
    AVVideoMaxKeyFrameIntervalKey: Int(fps.rounded()),
  ]
  if codec == .h264 {
    compression[AVVideoProfileLevelKey] = AVVideoProfileLevelH264HighAutoLevel
    compression[AVVideoH264EntropyModeKey] = AVVideoH264EntropyModeCABAC
  } else {
    compression[AVVideoProfileLevelKey] = kVTProfileLevel_HEVC_Main_AutoLevel as String
  }
  let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: codec,
    AVVideoWidthKey: outW,
    AVVideoHeightKey: outH,
    AVVideoColorPropertiesKey: [
      AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
      AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
      AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
    ],
    AVVideoCompressionPropertiesKey: compression,
  ])
  input.expectsMediaDataInRealTime = false
  writer.add(input)

  guard reader.startReading() else { throw reader.error ?? NSError(domain: "okuma", code: 1) }
  guard writer.startWriting() else { throw writer.error ?? NSError(domain: "yazma", code: 1) }
  writer.startSession(atSourceTime: .zero)

  final class Box: @unchecked Sendable {
    let reader: AVAssetReader; let output: AVAssetReaderOutput; let input: AVAssetWriterInput
    init(_ r: AVAssetReader, _ o: AVAssetReaderOutput, _ i: AVAssetWriterInput) { reader = r; output = o; input = i }
  }
  let box = Box(reader, output, input)
  await withCheckedContinuation { (done: CheckedContinuation<Void, Never>) in
    box.input.requestMediaDataWhenReady(on: DispatchQueue(label: "video")) {
      while box.input.isReadyForMoreMediaData {
        if let sample = box.output.copyNextSampleBuffer() {
          box.input.append(sample)
        } else {
          box.input.markAsFinished()
          done.resume()
          return
        }
      }
    }
  }
  await writer.finishWriting()
  if writer.status != .completed { throw writer.error ?? NSError(domain: "yazma", code: 2) }
  if reader.status == .failed { throw reader.error ?? NSError(domain: "okuma", code: 2) }
}

do {
  try await encode(codec: .hevc, bitsPerPixel: 0.18, to: URL(fileURLWithPath: base + ".mp4"))
  try await encode(codec: .h264, bitsPerPixel: 0.30, to: URL(fileURLWithPath: base + "-h264.mp4"))
} catch {
  fail("video dönüştürülemedi (\(input.lastPathComponent)): \(error.localizedDescription)")
}

// kapak görseli: yarım saniyeden (ilk kare çoğu zaman bulanık)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.maximumSize = CGSize(width: outW, height: outH)
let at = CMTime(seconds: min(0.5, duration.seconds / 2), preferredTimescale: 600)
do {
  let (image, _) = try await gen.image(at: at)
  let url = URL(fileURLWithPath: base + "-kapak.png") as CFURL
  guard let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil) else { fail("kapak yazılamadı") }
  CGImageDestinationAddImage(dest, image, nil)
  if !CGImageDestinationFinalize(dest) { fail("kapak yazılamadı") }
} catch {
  fail("kapak alınamadı: \(error.localizedDescription)")
}
print("\(outW)x\(outH) \(Int(fps.rounded()))fps \(String(format: "%.1f", duration.seconds))s")
