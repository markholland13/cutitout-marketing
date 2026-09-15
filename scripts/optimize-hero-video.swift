// macOS: swift scripts/optimize-hero-video.swift ORIGINAL.mp4 OUTPUT.mp4
// Inspect matching frames: swift scripts/optimize-hero-video.swift VIDEO.mp4 inspect /tmp/comparison
import Foundation
import AVFoundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
if args.count < 3 || (args[2] == "inspect" && args.count < 4) {
    print("Usage: optimize-hero-video.swift SOURCE OUTPUT | SOURCE inspect IMAGE_PREFIX")
    exit(1)
}
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let track = asset.tracks(withMediaType: .video)[0]
let size = track.naturalSize
print("Source: \(size.width)x\(size.height), \(track.nominalFrameRate) fps, \(CMTimeGetSeconds(asset.duration)) seconds, \(track.estimatedDataRate) bps, audio tracks \(asset.tracks(withMediaType: .audio).count)")
if args[2] == "inspect" {
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero
    for seconds in [3.0, 10.0, 17.0] {
        let image = try generator.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil)
        let url = URL(fileURLWithPath: "\(args[3])-\(Int(seconds)).png")
        let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
        CGImageDestinationAddImage(destination, image, nil)
        CGImageDestinationFinalize(destination)
    }
} else {
    let outputURL = URL(fileURLWithPath: args[2])
    guard !FileManager.default.fileExists(atPath: outputURL.path) else { fatalError("Output already exists") }
    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
    output.alwaysCopiesSampleData = false
    reader.add(output)
    let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true
    let width = min(1280, Int(size.width))
    let height = Int((Double(width)*size.height/size.width/2).rounded())*2
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey:AVVideoCodecType.h264,
        AVVideoWidthKey:width, AVVideoHeightKey:height,
        AVVideoCompressionPropertiesKey:[
            AVVideoAverageBitRateKey:2_000_000,
            AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel,
            AVVideoMaxKeyFrameIntervalDurationKey:2,
            AVVideoAllowFrameReorderingKey:true
        ]
    ])
    input.transform = track.preferredTransform
    writer.add(input)
    guard writer.startWriting(), reader.startReading() else { fatalError("Cannot start encoding: \(String(describing: writer.error)) \(String(describing: reader.error))") }
    writer.startSession(atSourceTime: .zero)
    var count = 0
    while let sample = output.copyNextSampleBuffer() {
        while !input.isReadyForMoreMediaData && writer.status == .writing { Thread.sleep(forTimeInterval:0.002) }
        guard input.append(sample) else { fatalError("Encoding failed: \(String(describing: writer.error))") }
        count += 1
    }
    guard reader.status == .completed else { fatalError("Read failed: \(String(describing: reader.error))") }
    input.markAsFinished()
    let semaphore = DispatchSemaphore(value:0)
    writer.finishWriting { semaphore.signal() }
    semaphore.wait()
    guard writer.status == .completed else { fatalError("Write failed: \(String(describing: writer.error))") }
    print("Encoded \(count) frames at \(width)x\(height), H.264 2 Mbps, fast-start MP4, no audio.")
}
