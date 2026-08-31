//
//  Components.swift
//  AuraUI
//
//  The shared vocabulary — pills, labels, cards, the orb, answer rows. Mirrors
//  the RN `@/components` set closely enough that the screens read the same.
//

import SwiftUI

// MARK: - Uppercase olive caption ("TUESDAY, JULY 22", "TODAY").

struct Label: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text.uppercased())
            .font(AuraFont.label)
            .tracking(1.4)
            .foregroundStyle(AuraColor.olive)
    }
}

// MARK: - Serif display / title / question text.

struct Serif: View {
    enum Variant { case display, title, moment, question }
    let text: String
    var variant: Variant = .title
    var center = false

    private var font: Font {
        switch variant {
        case .display: return AuraFont.display
        case .title: return AuraFont.title
        case .moment: return AuraFont.momentTitle
        case .question: return AuraFont.title
        }
    }

    var body: some View {
        Text(text)
            .font(font)
            .foregroundStyle(AuraColor.ink)
            .multilineTextAlignment(center ? .center : .leading)
            .frame(maxWidth: .infinity, alignment: center ? .center : .leading)
    }
}

// MARK: - Ink-filled primary action.

struct PillButton: View {
    let title: String
    var systemIcon: String? = nil
    var disabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: AuraSpace.sm) {
                if let icon = systemIcon { Image(systemName: icon) }
                Text(title).font(AuraFont.button)
            }
            .foregroundStyle(AuraColor.cream)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 17)
            .background(AuraColor.ink, in: Capsule())
            .opacity(disabled ? 0.4 : 1)
        }
        .disabled(disabled)
    }
}

// MARK: - Outlined secondary action.

struct OutlinePill: View {
    let title: String
    var systemIcon: String? = nil
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: AuraSpace.sm) {
                if let icon = systemIcon { Image(systemName: icon) }
                Text(title).font(AuraFont.button)
            }
            .foregroundStyle(AuraColor.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .overlay(Capsule().stroke(AuraColor.border, lineWidth: 1.5))
        }
    }
}

// MARK: - Quiet text link.

struct TextLink: View {
    let title: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(AuraFont.button).foregroundStyle(AuraColor.inkMuted)
        }
    }
}

// MARK: - White rounded surface.

struct Card<Content: View>: View {
    var fill: Color = AuraColor.card
    var dashed = false
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(AuraSpace.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(fill, in: RoundedRectangle(cornerRadius: AuraRadius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AuraRadius.card, style: .continuous)
                    .strokeBorder(
                        AuraColor.border,
                        style: StrokeStyle(lineWidth: 1, dash: dashed ? [5, 4] : [])
                    )
            )
    }
}

// MARK: - The orb — presence, not the performer. Ember gradient sphere.

struct Orb: View {
    var size: CGFloat = 56
    var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [AuraColor.emberSoft, AuraColor.ember, AuraColor.emberDeep],
                    center: .init(x: 0.35, y: 0.3),
                    startRadius: 1,
                    endRadius: size
                )
            )
            .frame(width: size, height: size)
            .shadow(color: AuraColor.ember.opacity(0.35), radius: 14, y: 6)
    }
}

// MARK: - White rounded row container + settings-style rows.

struct GroupCard<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(spacing: 0) { content }
            .background(AuraColor.card, in: RoundedRectangle(cornerRadius: AuraRadius.field, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AuraRadius.field, style: .continuous)
                    .strokeBorder(AuraColor.border, lineWidth: 1)
            )
    }
}

/// Hairline between rows, inset to align under the title.
struct RowDivider: View {
    var body: some View {
        Rectangle()
            .fill(AuraColor.divider)
            .frame(height: 1)
            .padding(.leading, AuraSpace.md)
    }
}

struct ListRow: View {
    let title: String
    var subtitle: String? = nil
    var trailing: String? = nil
    var showChevron = true
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            HStack(spacing: AuraSpace.sm) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(AuraFont.body).foregroundStyle(AuraColor.ink)
                    if let subtitle {
                        Text(subtitle).font(AuraFont.bodySmall).foregroundStyle(AuraColor.inkMuted)
                    }
                }
                Spacer()
                if let trailing {
                    Text(trailing).font(AuraFont.bodySmall).foregroundStyle(AuraColor.olive)
                }
                if showChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(AuraColor.oliveFaint)
                }
            }
            .padding(.vertical, 15)
            .padding(.horizontal, AuraSpace.md)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Week streak dots (gratitude).

struct WeekDots: View {
    let filled: [Bool]
    var body: some View {
        HStack(spacing: AuraSpace.sm) {
            ForEach(Array(filled.enumerated()), id: \.offset) { _, isFilled in
                Circle()
                    .fill(isFilled ? AuraColor.ember : Color.clear)
                    .frame(width: 12, height: 12)
                    .overlay(
                        Circle().strokeBorder(
                            isFilled ? Color.clear : AuraColor.oliveFaint, lineWidth: 1.5
                        )
                    )
            }
        }
    }
}

// MARK: - Plan chip (profile).

struct PlanChip: View {
    let label: String
    var body: some View {
        Text(label.uppercased())
            .font(AuraFont.label)
            .tracking(0.8)
            .foregroundStyle(AuraColor.emberDeep)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(AuraColor.parchment, in: Capsule())
    }
}

// MARK: - Selectable onboarding choice row.

struct AnswerRow: View {
    let label: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(label)
                    .font(AuraFont.body)
                    .foregroundStyle(AuraColor.ink)
                Spacer()
                ZStack {
                    Circle()
                        .strokeBorder(selected ? AuraColor.ember : AuraColor.oliveFaint, lineWidth: 1.5)
                        .frame(width: 22, height: 22)
                    if selected {
                        Circle().fill(AuraColor.ember).frame(width: 12, height: 12)
                    }
                }
            }
            .padding(.vertical, 16)
            .padding(.horizontal, AuraSpace.md)
            .background(
                selected ? AuraColor.oliveSoft.opacity(0.5) : AuraColor.card,
                in: RoundedRectangle(cornerRadius: AuraRadius.field, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: AuraRadius.field, style: .continuous)
                    .strokeBorder(selected ? AuraColor.ember.opacity(0.5) : AuraColor.border, lineWidth: 1)
            )
        }
    }
}
