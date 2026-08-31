//
//  AuraUIApp.swift
//  AuraUI
//
//  Entry point + the linear demo flow so all three screens are reachable:
//  Sign in → Onboarding → Home (tab bar). Pure UI — nothing is persisted.
//

import SwiftUI

@main
struct AuraUIApp: App {
    var body: some Scene {
        WindowGroup {
            RootFlow()
        }
    }
}

struct RootFlow: View {
    enum Stage { case signIn, onboarding, home }
    @State private var stage: Stage = .signIn

    var body: some View {
        switch stage {
        case .signIn:
            SignInView(onContinue: { stage = .onboarding })
                .transition(.opacity)
        case .onboarding:
            OnboardingView(
                onBack: { stage = .signIn },
                onContinue: { stage = .home }
            )
            .transition(.move(edge: .trailing))
        case .home:
            HomeShell()
                .transition(.opacity)
        }
    }
}
