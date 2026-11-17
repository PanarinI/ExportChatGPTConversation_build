import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
let a = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let fx = Double(a[3])!, fy = Double(a[4])!, fw = Double(a[5])!, fh = Double(a[6])!   // fractions of the image
let r = CGRect(x: fx * Double(img.width), y: fy * Double(img.height), width: fw * Double(img.width), height: fh * Double(img.height)).integral
let c = img.cropping(to: r)!
let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(d, c, nil); CGImageDestinationFinalize(d)
print(img.width, img.height, "->", c.width, c.height)
