//
//  ProfileView.swift
//  AuraUI
//
//  The Profile tab (UI only) — the "control center". Name in serif with a plan
//  chip and a gear, then Account, Memory, Basics, and Trust rows. Subtitles show
//  what would be the real data behind each door.
//

import SwiftUI

struct ProfileView: View {
    var body: some View {
        ZStack {
            AuraColor.bone.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: AuraSpace.lg) {
                    header

                    section("Account") {
                        ListRow(title: "Subscription", subtitle: "You're on the free plan.")
                        RowDivider()
                        ListRow(title: "Secure your account", subtitle: "Sign in so it's waiting on any phone.")
                    }

                    section("Memory") {
                        ListRow(title: "What I know about you", subtitle: "See and edit everything I remember.")
                        RowDivider()
                        ListRow(title: "Never include", subtitle: "Topics I keep out of everything I write.")
                    }

                    section("Basics") {
                        ListRow(title: "Dream city", trailing: "Lisbon")
                        RowDivider()
                        ListRow(title: "Dream home", trailing: "By the sea")
                        RowDivider()
                        ListRow(title: "Your people", trailing: "3")
                        RowDivider()
                        ListRow(title: "A note for me", subtitle: "Nothing yet — tap to tell me.")
                    }

                    section("Trust & privacy") {
                        ListRow(title: "Privacy policy")
                        RowDivider()
                        ListRow(title: "Terms of service")
                        RowDivider()
                        ListRow(title: "Help & support")
                    }
                }
                .padding(AuraSpace.screen)
            }
        }
    }

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: AuraSpace.xs) {
                Serif(text: "Maya", variant: .title)
                PlanChip(label: "Free")
            }
            Spacer()
            Image(systemName: "gearshape")
                .font(.system(size: 22))
                .foregroundStyle(AuraColor.ink)
        }
    }

    @ViewBuilder
    private func section<Content: View>(_ label: String, @ViewBuilder rows: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: AuraSpace.sm) {
            Label(label)
            GroupCard { rows() }
        }
    }
}

#Preview {
    ProfileView()
}
