//
//  AffirmationsView.swift
//  AuraUI
//
//  The Affirmations tab (UI only). Today's line on the parchment surface — the
//  voice, in italic ember serif — then "Create with Aura", then saved words.
//

import SwiftUI

struct AffirmationsView: View {
    private let saved = [
        "I move at the pace of my own becoming.",
        "My calm is a decision I keep making.",
        "I am allowed to take up space.",
    ]

    var body: some View {
        ZStack {
            AuraColor.bone.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: AuraSpace.lg) {
                    VStack(alignment: .leading, spacing: AuraSpace.xs) {
                        Label("Today · July 22")
                        Serif(text: "Affirmations", variant: .title)
                    }

                    // Today's affirmation — the parchment card, the voice in serif.
                    Card(fill: AuraColor.parchment) {
                        VStack(alignment: .leading, spacing: AuraSpace.lg) {
                            Text("I am becoming the person my future self already trusts.")
                                .font(AuraFont.voice)
                                .foregroundStyle(AuraColor.emberDeep)
                                .fixedSize(horizontal: false, vertical: true)

                            HStack(spacing: AuraSpace.xl) {
                                cardAction("speaker.wave.2", "Speak")
                                cardAction("square.and.arrow.up", "Share")
                                cardAction("heart", "Keep")
                                Spacer()
                            }
                        }
                    }

                    // Guided studio entry.
                    GroupCard {
                        ListRow(
                            title: "Create with Aura",
                            subtitle: "Write a new affirmation, guided step by step."
                        )
                    }

                    // Saved words.
                    VStack(alignment: .leading, spacing: AuraSpace.sm) {
                        Label("Saved")
                        GroupCard {
                            ForEach(Array(saved.enumerated()), id: \.offset) { index, line in
                                ListRow(title: line, showChevron: false)
                                if index < saved.count - 1 { RowDivider() }
                            }
                        }
                    }
                }
                .padding(AuraSpace.screen)
            }
        }
    }

    private func cardAction(_ icon: String, _ label: String) -> some View {
        VStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(AuraColor.ink)
            Text(label).font(AuraFont.label).foregroundStyle(AuraColor.inkMuted)
        }
    }
}

#Preview {
    AffirmationsView()
}
