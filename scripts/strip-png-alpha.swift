import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 3 else {
    FileHandle.standardError.write(Data("Usage: strip-png-alpha.swift INPUT OUTPUT\n".utf8))
    exit(64)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard
    let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
    let sourceImage = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
    FileHandle.standardError.write(Data("Unable to read input image.\n".utf8))
    exit(65)
}

let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.noneSkipLast.rawValue
guard let context = CGContext(
    data: nil,
    width: sourceImage.width,
    height: sourceImage.height,
    bitsPerComponent: 8,
    bytesPerRow: sourceImage.width * 4,
    space: colorSpace,
    bitmapInfo: bitmapInfo
) else {
    FileHandle.standardError.write(Data("Unable to create RGB bitmap context.\n".utf8))
    exit(70)
}

context.interpolationQuality = .none
context.setFillColor(CGColor(red: 15 / 255, green: 15 / 255, blue: 15 / 255, alpha: 1))
context.fill(CGRect(x: 0, y: 0, width: sourceImage.width, height: sourceImage.height))
context.draw(sourceImage, in: CGRect(x: 0, y: 0, width: sourceImage.width, height: sourceImage.height))

guard
    let opaqueImage = context.makeImage(),
    let destination = CGImageDestinationCreateWithURL(
        outputURL as CFURL,
        UTType.png.identifier as CFString,
        1,
        nil
    )
else {
    FileHandle.standardError.write(Data("Unable to create output image.\n".utf8))
    exit(70)
}

CGImageDestinationAddImage(destination, opaqueImage, nil)
guard CGImageDestinationFinalize(destination) else {
    FileHandle.standardError.write(Data("Unable to write output image.\n".utf8))
    exit(74)
}
