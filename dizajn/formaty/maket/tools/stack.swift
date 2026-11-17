import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
let a = Array(CommandLine.arguments.dropFirst()); let out = a[0]
var imgs: [CGImage] = []
for f in a.dropFirst() { if let s = CGImageSourceCreateWithURL(URL(fileURLWithPath: f) as CFURL, nil), let i = CGImageSourceCreateImageAtIndex(s, 0, nil) { imgs.append(i) } }
let W = imgs.map { $0.width }.max()!, gap = 10, H = imgs.reduce(0) { $0 + $1.height } + gap * (imgs.count + 1)
let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(CGColor(red: 0.8, green: 0.8, blue: 0.8, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
var y = H - gap
for im in imgs { y -= im.height; ctx.draw(im, in: CGRect(x: 0, y: y, width: im.width, height: im.height)); y -= gap }
let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: out) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(d, ctx.makeImage()!, nil); CGImageDestinationFinalize(d)
