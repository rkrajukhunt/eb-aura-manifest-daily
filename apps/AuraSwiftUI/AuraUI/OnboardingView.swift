//
//  OnboardingView.swift
//  AuraUI
//
//  The onboarding "conversation" beat (UI only). One question per screen: a top
//  bar with a back chevron and a progress track, a serif question + helper, a
//  single-select list of AnswerRows, and an ink Continue pinned to the bottom.
//

import SwiftUI

struct OnboardingView: View {
    var onBack: () -> Void
    var onContinue: () -> Void

    private let choices: [(key: String, label: String)] = [
        ("calm", "Calm and steady"),
        ("anxious", "A little anxious"),
        ("stuck", "Stuck, going in circles"),
        ("hopeful", "Quietly hopeful"),
        ("tired", "Worn out"),
    ]

    @State private var selected: String? = nil

    var body: some View {
        ZStack {
            AuraColor.bone.ignoresSafeArea()

            VStack(spacing: AuraSpace.lg) {
                topBar

                VStack(alignment: .leading, spacing: AuraSpace.sm) {
                    Serif(text: "How are you arriving today?", variant: .question)
                    Text("There's no wrong answer — this just shapes the voice you'll hear.")
                        .font(AuraFont.body)
                        .foregroundStyle(AuraColor.inkBody)
                }

                VStack(spacing: AuraSpace.sm) {
                    ForEach(choices, id: \.key) { choice in
                        AnswerRow(
                            label: choice.label,
                            selected: selected == choice.key,
                            action: { selected = choice.key }
                        )
                    }
                }

                Spacer()

                PillButton(title: "Continue", disabled: selected == nil, action: onContinue)
            }
            .padding(.horizontal, AuraSpace.screen)
            .padding(.bottom, AuraSpace.xl)
        }
    }

    // MARK: Top bar — back + progress track (step 3 of 8, illustrative).

    private var topBar: some View {
        HStack(spacing: AuraSpace.md) {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AuraColor.ink)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(AuraColor.oliveSoft).frame(height: 4)
                    Capsule().fill(auraEmber).frame(width: geo.size.width * 0.375, height: 4)
                }
            }
            .frame(height: 4)
        }
        .padding(.top, AuraSpace.sm)
    }
}

#Preview {
    OnboardingView(onBack: {}, onContinue: {})
}
