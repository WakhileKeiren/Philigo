PhiliGo (Phili+) — Pediatric Adherence & Care Companion
PhiliGo (Phili+) is a gamified web application prototype designed to support pediatric medication adherence, symptom check-ins, and caregiver coordination in Eswatini. Its clinical health education and care workflows are grounded in the Eswatini Standard Treatment Guidelines and Essential Medicines List (2021 Edition), with age-specific paediatric considerations referencing the Eswatini Paediatric Standard Treatment Guidelines.
Demo & Clinical Scope Notice: This web build is a demo architecture intended for prototyping, workflow walkthroughs, and educational demonstration. It does not replace formal clinical diagnosis, individualized prescriptions, or direct healthcare supervision.
Key Features
1. Clinical, Caregiver & Education Scope
Eswatini STG & EML (2021) Alignment: Emphasizes adherence checks, danger signs, non-pharmacological/lifestyle measures, proper medicine and inhaler technique, and timely clinic referral awareness, paired with cross-references to Eswatini Paediatric STG thresholds and regimens.
Demo Language: Parent/caregiver health education is currently provided in English for the demo.
Separate Caregiver Authentication: The Caregiver/Parent portal uses a separate password distinct from the child's profile/local unlock.
Simple Visual Medicine Selectors: Visual icon/dosage-form selectors (such as tablets, dispersible pills, oral syrups, and inhalers/spacers) replace mandatory photo uploads during setup and logging.
2. Gamification, Age Tiers & Contextual Nudges
15 In-Game Mini-Games: Includes Pill Runner, Pill Match, Memory Cards, Health Quiz, Breath Pacer, Dose Clock, Germ Blaster, Syrup Measure, Symptom Scout, Shield Builder, Water Catch, Healthy Plate, Clinic Path, Pulse Tap, and Med Scramble.
Three Automatic Age Tiers (Parent-Entered Age at Registration):
Ages 6–8: Simple visuals, guided tracking, and strong caregiver involvement.
Ages 9–12: Interactive puzzles, visual dose tracking, and streak quests.
Ages 13–16: Teen-toned framing, autonomy-oriented nudges, and full challenge access.
App / Phone-Use Activity Nudges: Simulates contextual prompts when a child is active on phone apps, games, or social feeds so dose checks stay timely.
PRN Safe Logging & Symptom Check-Ins: Rewards safe as-needed (PRN) medication logging and symptom check-ins, and flags severe symptoms for immediate caregiver/clinic escalation.
3. Offline Resilience, Auditability, Recovery & Reminders
Online OTP vs. Offline Local Unlock: Account registration, phone verification, and OTP delivery are modeled as online steps, while daily local unlock via PIN or Passkey works offline without requiring a live connection.
Power-Outage Backfill with Audit Trail: Caregivers can retroactively log missed doses after power outages or device downtime. Every entry automatically records who logged it and when (timestamp + real-time vs. retroactive metadata) for clinician review.
Account & Password Recovery: Includes a recovery workflow when a caregiver forgets their portal password or updates their phone number.
Anonymous Appointment Reminders: Clinic/follow-up reminders keep sensitive clinical details out of notification previews.
Repository Structure