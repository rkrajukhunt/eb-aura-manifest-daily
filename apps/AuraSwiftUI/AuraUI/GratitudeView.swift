//
//  GratitudeView.swift
//  AuraUI
//
//  The Gratitude tab (UI only). Serif title + a week of dots, the day's prompt
//  on a solid card closing on an ember mark, a note field, then this week's
//  entries.
//

import SwiftUI

struct GratitudeView: View {
    @State private var draft = ""

    private let history: [(day: String, entry: String)] = [
        ("Yesterday", "A long walk with no phone in my pocket."),
        ("Sunday", "My sister called just to say hello."),
        ("Saturday", "The first cup of coffee, still hot."),
    ]

    var body: some View {
        ZStack {
            AuraColor.bone.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: AuraSpace.lg) {
                    VStack(alignment: .leading, spacing: AuraSpace.md) {
                        Serif(text: "Gratitude", variant: .title)
                        WeekDots(filled: [true, true, true, true, false, false, false])
                    }

                    // Today's prompt + entry.
                    Card {
                        VStack(alignment: .leading, spacing: AuraSpace.md) {
                            (
                                Text("What made today feel lighter")
                                    .foregroundColor(AuraColor.ink)
                                + Text("?").foregroundColor(AuraColor.ember)
                            )
                            .font(AuraFont.momentTitle)

                            entryField

                            PillButton(title: "Save", disabled: draft.isEmpty, action: {})
                        }
                    }

                    // This week's entries.
                    VStack(alignment: .leading, spacing: AuraSpace.sm) {
                        Label("This week")
                        GroupCard {
                            ForEach(Array(history.enumerated()), id: \.offset) { index, item in
                                ListRow(
                                    title: item.entry,
                                    subtitle: item.day,
                                    showChevron: false
                                )
                                if index < history.count - 1 { RowDivider() }
                            }
                        }
                    }
                }
                .padding(AuraSpace.screen)
            }
        }
    }

    private var entryField: some View {
        ZStack(alignment: .topLeading) {
            if draft.isEmpty {
                Text("Tell me…")
                    .font(AuraFont.body)
                    .foregroundStyle(AuraColor.oliveFaint)
                    .padding(.top, 12)
                    .padding(.leading, 14)
            }
            TextEditor(text: $draft)
                .font(AuraFont.body)
                .foregroundStyle(AuraColor.ink)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 96)
                .padding(6)
        }
        .background(AuraColor.bone.opacity(0.6), in: RoundedRectangle(cornerRadius: AuraRadius.field, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: AuraRadius.field, style: .continuous)
                .strokeBorder(AuraColor.border, lineWidth: 1)
        )
    }
}

#Preview {
    GratitudeView()
}
