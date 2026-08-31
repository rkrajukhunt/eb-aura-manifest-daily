//
//  HomeView.swift
//  AuraUI
//
//  Home — "the daily heartbeat" (UI only). Wrapped in a TabView so it carries a
//  real bottom nav bar; only Home is populated, the other tabs are placeholders.
//  Content order mirrors the RN HomeScreen: greeting, streak, today's moment,
//  collections, recently played, and the Manifest button.
//

import SwiftUI

struct HomeShell: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { SwiftUI.Label("Home", systemImage: "house.fill") }
            AffirmationsView()
                .tabItem { SwiftUI.Label("Affirmations", systemImage: "quote.bubble") }
            GratitudeView()
                .tabItem { SwiftUI.Label("Gratitude", systemImage: "heart") }
            ProfileView()
                .tabItem { SwiftUI.Label("Profile", systemImage: "person") }
        }
        .tint(AuraColor.emberDeep)
    }
}

struct HomeView: View {
    var body: some View {
        ZStack {
            AuraColor.bone.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: AuraSpace.lg) {
                    header
                    streakCard
                    todaySection
                    collectionsSection
                    recentSection
                    PillButton(title: "Manifest a moment", systemIcon: "plus", action: {})
                }
                .padding(AuraSpace.screen)
            }
        }
    }

    // MARK: Header — date + greeting + orb.

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: AuraSpace.xs) {
                Label("Tuesday, July 22")
                Serif(text: "Good morning, Maya", variant: .title)
            }
            Spacer()
            Orb(size: 56)
        }
    }

    // MARK: Streak.

    private var streakCard: some View {
        Card(fill: AuraColor.parchment) {
            HStack(spacing: AuraSpace.md) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(AuraColor.ember)
                VStack(alignment: .leading, spacing: 2) {
                    Text("12 days").font(AuraFont.headline).foregroundStyle(AuraColor.ink)
                    Text("You've shown up every day this month.")
                        .font(AuraFont.bodySmall).foregroundStyle(AuraColor.inkBody)
                }
                Spacer()
            }
        }
    }

    // MARK: Today's moment — the ember hero.

    private var todaySection: some View {
        VStack(alignment: .leading, spacing: AuraSpace.sm) {
            Label("Today")
            Card {
                VStack(alignment: .leading, spacing: AuraSpace.md) {
                    Serif(text: "The version of you who already arrived", variant: .moment)
                    Text("Shaped around family & love.")
                        .font(AuraFont.bodySmall).foregroundStyle(AuraColor.inkMuted)

                    HStack(spacing: AuraSpace.md) {
                        ZStack {
                            Circle().fill(auraEmber).frame(width: 52, height: 52)
                            Image(systemName: "play.fill")
                                .font(.system(size: 20)).foregroundStyle(.white)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Listen now").font(AuraFont.button).foregroundStyle(AuraColor.ink)
                            Text("2:30").font(AuraFont.bodySmall).foregroundStyle(AuraColor.inkMuted)
                        }
                        Spacer()
                        Image(systemName: "heart")
                            .font(.system(size: 20)).foregroundStyle(AuraColor.heart)
                    }
                }
            }
        }
    }

    // MARK: Collections grid.

    private var collectionsSection: some View {
        VStack(alignment: .leading, spacing: AuraSpace.sm) {
            Label("Collections")
            HStack(spacing: AuraSpace.sm) {
                collectionCard(title: "Favorites", count: "8 moments · ♥", fill: AuraColor.blushSoft)
                collectionCard(title: "On demand", count: "3 moments", fill: AuraColor.parchment)
            }
        }
    }

    private func collectionCard(title: String, count: String, fill: Color) -> some View {
        VStack(alignment: .leading, spacing: AuraSpace.xs / 2) {
            Text(title).font(AuraFont.button).foregroundStyle(AuraColor.ink)
            Text(count).font(AuraFont.bodySmall).foregroundStyle(AuraColor.inkBody)
        }
        .padding(.vertical, AuraSpace.md)
        .padding(.horizontal, AuraSpace.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(fill, in: RoundedRectangle(cornerRadius: AuraRadius.field, style: .continuous))
    }

    // MARK: Recently played — serif titles, mono-ish durations.

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: AuraSpace.sm) {
            Label("Recently played")
            VStack(spacing: 0) {
                recentRow("A softer morning", "1:45")
                Divider().background(AuraColor.divider)
                recentRow("You are allowed to rest", "2:10")
                Divider().background(AuraColor.divider)
                recentRow("The quiet win", "1:30")
            }
            .background(AuraColor.card, in: RoundedRectangle(cornerRadius: AuraRadius.field, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AuraRadius.field, style: .continuous)
                    .strokeBorder(AuraColor.border, lineWidth: 1)
            )
        }
    }

    private func recentRow(_ title: String, _ duration: String) -> some View {
        HStack {
            Text(title)
                .font(AuraFont.momentTitle)
                .foregroundStyle(AuraColor.ink)
            Spacer()
            Text(duration)
                .font(AuraFont.bodySmall.monospacedDigit())
                .foregroundStyle(AuraColor.olive)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, AuraSpace.md)
    }
}

#Preview {
    HomeShell()
}
