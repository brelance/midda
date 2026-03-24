#!/usr/bin/env swift
//
// ocr_vision.swift
// Performs OCR using macOS Vision framework.
//
// Usage: swift ocr_vision.swift <image_path> [language_hint]
// Output: JSON with recognized text blocks
//
// Exit codes: 0 = success, 1 = error

import Foundation
import Vision
import AppKit

struct OcrBlock: Codable {
    let text: String
    let confidence: Double
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct OcrResult: Codable {
    let text: String
    let blocks: [OcrBlock]
    let language: String?
}

func performOCR(imagePath: String, languageHint: String?) {
    guard let image = NSImage(contentsOfFile: imagePath) else {
        let errorJson = ["error": "无法加载图片: \(imagePath)"]
        if let data = try? JSONSerialization.data(withJSONObject: errorJson),
           let str = String(data: data, encoding: .utf8) {
            print(str)
        }
        exit(1)
    }

    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        let errorJson = ["error": "无法转换为 CGImage"]
        if let data = try? JSONSerialization.data(withJSONObject: errorJson),
           let str = String(data: data, encoding: .utf8) {
            print(str)
        }
        exit(1)
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true

    // Set recognition languages
    var languages = ["ja", "zh-Hans", "zh-Hant", "en"]
    if let hint = languageHint {
        // Move hinted language to front
        languages.removeAll { $0 == hint }
        languages.insert(hint, at: 0)
    }

    if #available(macOS 13.0, *) {
        request.automaticallyDetectsLanguage = true
    }

    let revision: Int
    if #available(macOS 13.0, *) {
        revision = VNRecognizeTextRequestRevision3
    } else {
        revision = VNRecognizeTextRequestRevision2
    }
    request.revision = revision
    request.recognitionLanguages = languages

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

    do {
        try handler.perform([request])
    } catch {
        let errorJson = ["error": "OCR 失败: \(error.localizedDescription)"]
        if let data = try? JSONSerialization.data(withJSONObject: errorJson),
           let str = String(data: data, encoding: .utf8) {
            print(str)
        }
        exit(1)
    }

    guard let observations = request.results else {
        let result = OcrResult(text: "", blocks: [], language: nil)
        if let data = try? JSONEncoder().encode(result),
           let str = String(data: data, encoding: .utf8) {
            print(str)
        }
        exit(0)
    }

    let imageWidth = Double(cgImage.width)
    let imageHeight = Double(cgImage.height)

    var blocks: [OcrBlock] = []
    var fullText = ""

    for observation in observations {
        guard let topCandidate = observation.topCandidates(1).first else { continue }

        let boundingBox = observation.boundingBox
        let block = OcrBlock(
            text: topCandidate.string,
            confidence: Double(topCandidate.confidence),
            x: boundingBox.origin.x * imageWidth,
            y: (1.0 - boundingBox.origin.y - boundingBox.height) * imageHeight,
            width: boundingBox.width * imageWidth,
            height: boundingBox.height * imageHeight
        )
        blocks.append(block)

        if !fullText.isEmpty { fullText += "\n" }
        fullText += topCandidate.string
    }

    let result = OcrResult(text: fullText, blocks: blocks, language: languageHint)
    if let data = try? JSONEncoder().encode(result),
       let str = String(data: data, encoding: .utf8) {
        print(str)
    }
}

// --- Main ---
let args = CommandLine.arguments
guard args.count >= 2 else {
    print("{\"error\": \"Usage: swift ocr_vision.swift <image_path> [language_hint]\"}")
    exit(1)
}

let imagePath = args[1]
let languageHint = args.count >= 3 ? args[2] : nil

performOCR(imagePath: imagePath, languageHint: languageHint)
