"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Image from "next/image";

import { Button } from "@/components/ui/button";

export function HomeSignInCard() {
	return (
		<div className="flex flex-col">
			{/* Hero Section */}
			<section className="flex flex-col items-center gap-6 pb-20 pt-12 text-center sm:pt-20">
				<div className="animate-fade-in flex flex-col items-center gap-4">
					<p className="text-sm font-medium tracking-widest uppercase text-muted-foreground">
						iVTG Examenvoorbereiding
					</p>
					<h2 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
						Beheers de <span className="italic">Voortgangstoets</span>
					</h2>
					<p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
						Oefen met echte examenvragen, ontvang AI‑gegenereerde persoonlijke
						feedback en volg je voortgang.
					</p>
				</div>

				<div className="animate-fade-in-delayed flex gap-3 pt-2">
					<SignInButton mode="modal">
						<Button size="lg" className="px-8 text-base">
							Inloggen
						</Button>
					</SignInButton>
					<SignUpButton mode="modal">
						<Button variant="outline" size="lg" className="px-8 text-base">
							Account aanmaken
						</Button>
					</SignUpButton>
				</div>
			</section>

			{/* Feature Showcase */}
			<section className="pb-24">
				<div className="flex flex-col gap-16">
					{/* Example 1 — Wrong answer feedback */}
					<div className="animate-fade-in-up group flex flex-col items-center gap-5">
						<div className="overflow-hidden rounded-2xl border bg-background shadow-lg transition-shadow duration-500 hover:shadow-xl">
							<Image
								src="/example1.png"
								alt="Oefenvraag met gedetailleerde feedback na een fout antwoord"
								width={720}
								height={420}
								className="w-full"
								quality={95}
								priority
							/>
						</div>
						<p className="max-w-md text-center text-sm leading-relaxed text-muted-foreground">
							Beantwoord vragen en ontvang{" "}
							<span className="font-medium text-foreground">
								AI‑gegenereerde uitleg
							</span>{" "}
							die je helpt precies te begrijpen waar het fout ging.
						</p>
					</div>

					{/* Example 2 — Correct answer */}
					<div className="animate-fade-in-up-delayed group flex flex-col items-center gap-5">
						<div className="overflow-hidden rounded-2xl border bg-background shadow-lg transition-shadow duration-500 hover:shadow-xl">
							<Image
								src="/example2.png"
								alt="Oefenvraag met een correct antwoord en automatisch doorgaan"
								width={720}
								height={420}
								className="w-full"
								quality={95}
							/>
						</div>
						<p className="max-w-md text-center text-sm leading-relaxed text-muted-foreground">
							Krijg{" "}
							<span className="font-medium text-foreground">
								directe bevestiging
							</span>{" "}
							bij goede antwoorden en werk in je eigen tempo door de vragen.
						</p>
					</div>
				</div>
			</section>

			{/* Divider */}
			<div className="mx-auto h-px w-16 bg-border" />

			{/* Creator Footer */}
			<footer className="flex flex-col items-center gap-5 py-16">
				<div className="h-16 w-16 overflow-hidden rounded-full border-2 border-border shadow-sm">
					<Image
						src="/me.JPG"
						alt="Abel de Bruijn"
						width={64}
						height={64}
						className="h-full w-full object-cover"
					/>
				</div>
				<div className="flex flex-col items-center gap-1.5 text-center">
					<p className="text-sm text-muted-foreground">Gemaakt door</p>
					<a
						href="https://www.abeldebruijn.nl"
						target="_blank"
						rel="noopener noreferrer"
						className="text-base font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-200 hover:decoration-foreground"
					>
						Abel de Bruijn
					</a>
				</div>
			</footer>
		</div>
	);
}
