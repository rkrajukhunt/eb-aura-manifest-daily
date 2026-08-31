//
//  SignInView.swift
//  AuraUI
//
//  The sign-in screen (UI only — no auth wired). Ember orb, serif welcome,
//  ink provider pills, a quiet "Maybe later".
//

import SwiftUI

struct SignInView: View {
    var onContinue: () -> Void

    var body: some View {
        ZStack {
            AuraColor.bone.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: AuraSpace.lg) {
                    Orb(size: 92)
                    VStack(spacing: AuraSpace.sm) {
                        Serif(text: "Welcome to Aura", variant: .display, center: true)
                        Text("Your future self is already speaking.\nSign in to hear today's moment.")
                            .font(AuraFont.body)
                            .foregroundStyle(AuraColor.inkBody)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, AuraSpace.screen)

                Spacer()

                VStack(spacing: AuraSpace.sm) {
                    PillButton(title: "Continue with Apple", systemIcon: "apple.logo", action: onContinue)
                    PillButton(title: "Continue with Google", systemIcon: "g.circle.fill", action: onContinue)
                    OutlinePill(title: "Continue with email", systemIcon: "envelope", action: onContinue)

                    TextLink(title: "Maybe later", action: onContinue)
                        .padding(.top, AuraSpace.xs)
                }
                .padding(.horizontal, AuraSpace.screen)
                .padding(.bottom, AuraSpace.xl)
            }
        }
    }
}

#Preview {
    SignInView(onContinue: {})
}
