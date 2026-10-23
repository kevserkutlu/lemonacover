// Fotoğrafı okur (HEIC, JPEG, PNG, WebP…), telefonun döndürme bilgisini uygular,
// uzun kenarı en fazla <max> piksel olacak şekilde küçültür ve PNG olarak yazar.
// Kullanım: swift foto-hazirla.swift <max> <girdi> <çıktı> [<girdi> <çıktı> …]
// scripts/fotolar.mjs tarafından çağrılır; elle çalıştırmaya gerek yok.
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = Array(CommandLine.arguments.dropFirst())
guard args.count >= 3, let maxSide = Int(args[0]) else {
  FileHandle.standardError.write("kullanım: foto-hazirla.swift <max> <girdi> <çıktı> …\n".data(using: .utf8)!)
  exit(2)
}

var failed = false
var i = 1
while i + 1 < args.count {
  let input = URL(fileURLWithPath: args[i])
  let output = URL(fileURLWithPath: args[i + 1])
  i += 2
  guard let src = CGImageSourceCreateWithURL(input as CFURL, nil),
        let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
        let w = props[kCGImagePropertyPixelWidth] as? Int,
        let h = props[kCGImagePropertyPixelHeight] as? Int
  else {
    FileHandle.standardError.write("okunamadı: \(input.path)\n".data(using: .utf8)!)
    failed = true
    continue
  }
  let opts: [CFString: Any] = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceCreateThumbnailWithTransform: true, // döndürme bilgisini uygula
    kCGImageSourceThumbnailMaxPixelSize: min(maxSide, max(w, h)), // büyütme yok
  ]
  guard let img = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary),
        let dest = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil)
  else {
    FileHandle.standardError.write("dönüştürülemedi: \(input.path)\n".data(using: .utf8)!)
    failed = true
    continue
  }
  CGImageDestinationAddImage(dest, img, nil)
  if !CGImageDestinationFinalize(dest) {
    FileHandle.standardError.write("yazılamadı: \(output.path)\n".data(using: .utf8)!)
    failed = true
  }
}
exit(failed ? 1 : 0)
