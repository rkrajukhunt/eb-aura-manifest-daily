//
//  DesignSystem.swift
//  AuraUI
//
//  Aura Design v3 "Ember & Bone", ported to SwiftUI.
//
//  Raw hex values live only here (mirrors palette.ts in the RN app). Screens use
//  the semantic tokens below — bone backgrounds, white cards, an ember gradient
//  reserved for anything that speaks or plays, ink-black pills for action.
//
//  Fonts: the RN app bundles Newsreader (serif) + Figtree (sans). Here we stand
//  in with the system serif and system sans-serif so the project runs with zero
//  setup. Drop the real .ttf files into the target and swap `AuraFont` to use
//  `.custom(...)` if you want a pixel-exact match.
//

import Foundation
import SwiftUI

// MARK: - Colour

extension Color {
    init(hex: String) {
        let s = Scanner(string: hex)
        var rgb: UInt64 = 0
        s.scanHexInt64(&rgb)
        self.init(
            .sRGB,
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255,
            opacity: 1
        )
    }
}

enum AuraColor {
    // Bone neutrals — every screen background.
    static let bone = Color(hex: "ECE9DF")
    static let boneDeep = Color(hex: "E2DECF")
    static let cream = Color(hex: "F5F2E8")     // text on ink fills
    static let card = Color.white

    // Ink — text, CTAs. Warm near-black, never pure black.
    static let ink = Color(hex: "1B1810")
    static let inkBody = Color(hex: "4A4536")
    static let inkMuted = Color(hex: "6F6A58")

    // Olive — the quiet workhorse: captions, borders, selected chips.
    static let olive = Color(hex: "8A8265")
    static let oliveSoft = Color(hex: "DAD5BE")
    static let divider = Color(hex: "EFECE0")
    static let oliveFaint = Color(hex: "B4AE9C")
    static let border = Color(hex: "DAD5BE")

    // Ember — voice & audio only. Gradient runs emberSoft → ember.
    static let ember = Color(hex: "E2682F")
    static let emberSoft = Color(hex: "F2A96F")
    static let emberDeep = Color(hex: "C9531F")

    // Blush & parchment — marked days, affirmations.
    static let blushSoft = Color(hex: "FBEAF0")
    static let heart = Color(hex: "E38FB0")
    static let parchment = Color(hex: "F4EBD6")
}

/// The ember gradient — the only place warmth is "earned" (voice / play / orb).
let auraEmber = LinearGradient(
    colors: [AuraColor.emberSoft, AuraColor.ember],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
)

// MARK: - Type

enum AuraFont {
    static let display = Font.system(size: 34, weight: .medium, design: .serif)
    static let title = Font.system(size: 27, weight: .medium, design: .serif)
    static let momentTitle = Font.system(size: 21, weight: .medium, design: .serif)
    static let voice = Font.system(size: 23, weight: .medium, design: .serif).italic()

    static let headline = Font.system(size: 16, weight: .bold)
    static let body = Font.system(size: 15, weight: .regular)
    static let bodySmall = Font.system(size: 13, weight: .medium)
    static let button = Font.system(size: 15, weight: .semibold)
    static let label = Font.system(size: 11, weight: .semibold)
}

// MARK: - Spacing / radii

enum AuraSpace {
    static let xs: CGFloat = 6
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let screen: CGFloat = 24
}

enum AuraRadius {
    static let card: CGFloat = 22
    static let field: CGFloat = 14
    static let pill: CGFloat = 999
}
