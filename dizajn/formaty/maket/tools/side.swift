import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
let args = Array(CommandLine.arguments.dropFirst())
let out = args[0]; let files = Array(args.dropFirst())
var imgs: [CGImage] = []
for f in files { if let s = CGImageSourceCreateWithURL(URL(fileURLWithPath: f) as CFURL, nil), let i = CGImageSourceCreateImageAtIndex(s, 0, nil) { imgs.append(i) } }
let cols = imgs.count, w = imgs[0].width, h = imgs[0].height, gap = 8
let rows = (imgs.count + cols - 1) / cols
let W = cols * w + (cols + 1) * gap, H = rows * h + (rows + 1) * gap
let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(CGColor(red: 0.85, green: 0.85, blue: 0.85, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
for (k, im) in imgs.enumerated() { let r = k / cols, c = k % cols
  ctx.draw(im, in: CGRect(x: gap + c * (w + gap), y: H - (gap + (r + 1) * h + r * gap), width: w, height: h)) }
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: out) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil); CGImageDestinationFinalize(dest)
