function publicEnv(name: string, fallback: string) {
  const value =
    typeof process === "undefined" ? undefined : process.env[name]?.trim();
  return value || fallback;
}

export const LEGAL = {
  productName: "Study A",
  operatorName: publicEnv(
    "NEXT_PUBLIC_LEGAL_OPERATOR",
    "the operator of Study A",
  ),
  contactEmail: publicEnv("NEXT_PUBLIC_LEGAL_EMAIL", "privacy@example.com"),
  jurisdiction: publicEnv("NEXT_PUBLIC_LEGAL_JURISDICTION", "Hong Kong"),
  lastUpdated: "13 August 2026",
  hosting: "Vercel",
} as const;

export type LegalValues = {
  product: string;
  operator: string;
  email: string;
  jurisdiction: string;
  hosting: string;
  localeCookie: string;
};

export function legalValues(localeCookie: string): LegalValues {
  return {
    product: LEGAL.productName,
    operator: LEGAL.operatorName,
    email: LEGAL.contactEmail,
    jurisdiction: LEGAL.jurisdiction,
    hosting: LEGAL.hosting,
    localeCookie,
  };
}

export type LegalBlock = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

function fill(template: string, v: LegalValues) {
  return template
    .replaceAll("{product}", v.product)
    .replaceAll("{operator}", v.operator)
    .replaceAll("{email}", v.email)
    .replaceAll("{jurisdiction}", v.jurisdiction)
    .replaceAll("{hosting}", v.hosting)
    .replaceAll("{localeCookie}", v.localeCookie);
}

function block(
  heading: string,
  paragraphs: string[],
  bullets: string[] | undefined,
  v: LegalValues,
): LegalBlock {
  return {
    heading: fill(heading, v),
    paragraphs: paragraphs.map((p) => fill(p, v)),
    bullets: bullets?.map((b) => fill(b, v)),
  };
}

export function privacyBlocks(v: LegalValues): LegalBlock[] {
  return [
    block("1. Who we are", [
      "{product} is an AI study tool that turns notes, files, links, and topics into flashcards, quizzes, and a community encyclopedia. It is operated by {operator}.",
      "For privacy questions, access, or deletion requests, email {email}. These pages describe how the live product works. They are not legal advice.",
    ], undefined, v),
    block("2. Information we collect", [
      "We collect only what we need to run accounts, generate study materials, and keep the service secure.",
    ], [
      "Account data: email address, password hash (we do not store your raw password), display name, user ID, role (learner or admin), and passkey credentials if you add one. If optional Clerk sign-in is enabled, Clerk may also hold your sign-in identifiers under its own terms.",
      "Study data: decks, cards (front, back, hints, quiz options), ratings, spaced-repetition state, quiz answers and scores, share/visibility settings, subject and grade tags, and weekly energy (study allowance) balances. Energy is an in-app limit, not money.",
      "Uploads and sources: text you paste, topics, fetched URL/YouTube study text, and files (PDF, images, Markdown, TXT) stored in private Supabase Storage when you upload. You can choose to drop source files immediately, keep them about 24 hours, or keep them with the deck.",
      "Community data: public or unlisted decks you submit, copies you make of library packs, likes, and moderation reports. Seed encyclopedia packs are published by us, not by learners.",
      "Media: card images we store (licensed Wikimedia Commons or Openverse photos with attribution, or rarely AI-generated community art labelled as such). We keep author, licence, and source URL with the card.",
      "Technical data: standard server and host logs (which may include IP address, user agent, and request path), error reports, and essential cookies described in the Cookie Notice.",
    ], v),
    block("3. How we use information", [
      "We use this information to create and secure your account, generate and store flashcards and quizzes, attach licensed pictures when a photo is useful, save study and quiz progress, run the community library, enforce energy and rate limits, moderate public decks, send spoken audio when you tap Speak, and diagnose outages or abuse.",
      "We do not sell your personal data. We do not use advertising cookies or sell browsing data for ads. We do not use learner prompts to train our own foundation models.",
    ], undefined, v),
    block("4. Hong Kong Personal Data (Privacy) Ordinance", [
      "We handle personal data in line with the Personal Data (Privacy) Ordinance (Cap. 486) of {jurisdiction}. We collect data for the purposes in this policy, use it in ways you would reasonably expect for a study app, keep it no longer than needed, and take reasonable security measures.",
      "You may request access to or correction of your personal data by emailing {email}. We may need to verify it is you. We will respond within the time the Ordinance requires.",
    ], undefined, v),
    block("5. AI processing", [
      "When you generate a deck or quiz, the study text (and, for scanned PDFs or photos, page images) is sent to the model provider you pick.",
      "Cloud generation uses OpenRouter, which routes the request to the selected model. OpenRouter and that model host process the prompt under their own privacy terms. Do not paste secrets, exam papers you are not allowed to share, or other people’s personal data.",
      "If you run local Ollama, prompts stay on the machine that hosts Ollama. Ollama is not available on our {hosting} production app; it is for self-hosted or local use only.",
      "Learners do not pay for or run image-generation models. User generate may look up a confirmed-licence photo when a picture would help. AI illustrations are a last resort for community/admin library art only, and those cards are labelled “AI-generated”.",
    ], undefined, v),
    block("6. Licensed images", [
      "We look up pictures in this order: Wikimedia Commons, then other confirmed-licence sources such as Openverse (CC0, public domain, CC BY, or CC BY-SA, commercial-ok). We download a copy into our storage instead of hotlinking. We store attribution (creator, licence, source URL) and show credit under the picture.",
      "We skip unclear, non-commercial, fair-use, or brand/character images. Copying a community deck copies the image URL and the credit. Wikimedia, Openverse, and similar sites receive a search/download request; they do not receive your account email from us.",
    ], undefined, v),
    block("7. Community, sharing, and embeds", [
      "If you make a deck public, its title, cards, and pictures can be seen by signed-in users in the community library. Unlisted share links work for anyone who has the URL, including people who are not signed in. Embeds are read-only.",
      "Do not publish other people’s personal data or content you do not have the right to share. We may hide or remove public decks that fail moderation or that we are told infringe rights.",
    ], undefined, v),
    block("8. Speech", [
      "If you tap Speak, the card text is sent to our speech endpoint (currently a text-to-speech library running on our server) to produce audio. That text is used only to speak the card.",
    ], undefined, v),
    block("9. Children and schools", [
      "{product} is a study aid. It is not directed at children under 13. If you are under 18, use the app with a parent, guardian, or teacher. Schools or admins who provision accounts are responsible for having a lawful basis to do so.",
      "AI cards can be wrong. They are not a substitute for teaching, official syllabuses, or exam instructions.",
    ], undefined, v),
    block("10. Processors and transfers", [
      "We use other organisations to run the service. They only get what they need to do that job.",
    ], [
      "{hosting}: hosts the website and API (including preview deployments).",
      "Supabase: Postgres database and private file storage.",
      "Better Auth: email/password and passkey sign-in (session cookies on our domain).",
      "Clerk (optional): hosted/social sign-in if those keys are configured.",
      "OpenRouter and the model provider you select: generation prompts and outputs.",
      "Wikimedia Commons / Openverse: image search and download of licensed files.",
    ], v),
    block("11. International hosting", [
      "Servers for {hosting}, Supabase, OpenRouter, or Clerk may be outside {jurisdiction}. If you use the cloud app, your data may be transferred to and stored in those places so we can provide the service. We choose reputable processors and HTTPS in transit.",
    ], undefined, v),
    block("12. Retention", [
      "Account, deck, card, study, quiz, and energy records stay until you delete the deck or we delete the account after a valid request.",
      "Source files follow the retention you picked at generate time (delete now, about 24 hours, or keep with the deck). After a successful generate we clear leftover source text when retention is not “keep”.",
      "Server logs are kept only as long as needed for security and debugging, then rotated by the host.",
      "If you ask us to delete your account, we will delete or irreversibly anonymise personal data we control, except records we must keep for security, abuse, or law (for example audit logs of admin actions).",
    ], undefined, v),
    block("13. Your choices", [
      "You can sign out, edit or delete decks you own, turn off share links, change language, and email {email} to request access, correction, or deletion. Self-serve full account deletion may be added later; until then we handle deletion by email.",
      "You can block cookies in your browser; essential cookies are required to stay signed in. See the Cookie Notice.",
    ], undefined, v),
    block("14. Security", [
      "We use HTTPS, hashed passwords, private storage buckets, and role checks for admin tools. No method is perfectly secure. Tell us at {email} if you think an account or the service was misused.",
    ], undefined, v),
    block("15. Changes", [
      "If we change this policy in a material way, we will update the “Last updated” date. Continued use after that date means you accept the updated policy.",
    ], undefined, v),
    block("16. Governing law", [
      "This policy is governed by the laws of {jurisdiction}, without regard to conflict-of-law rules. The English text is the official version.",
    ], undefined, v),
  ];
}

export function termsBlocks(v: LegalValues): LegalBlock[] {
  return [
    block("1. Agreement", [
      "These Terms govern use of {product} by {operator}. By creating an account or using the service you agree to these Terms and the Privacy Policy. If you do not agree, do not use the app.",
    ], undefined, v),
    block("2. The service", [
      "{product} helps you generate flashcards and quizzes from topics, text, URLs, and files; study with flip cards, ratings, and speech; take trainer-style quizzes; and browse or copy community encyclopedia packs.",
      "Features, models, energy grants, and limits can change as we improve the product. Cloud generation on {hosting} needs a configured OpenRouter key. Local Ollama is optional and not part of the hosted {hosting} deployment.",
    ], undefined, v),
    block("3. Eligibility", [
      "You must be able to form a contract under the laws of {jurisdiction}. If you are under 18, a parent, guardian, or school must agree to these Terms for you. Do not use the service if you are under 13.",
    ], undefined, v),
    block("4. Accounts", [
      "Keep your password and passkeys secret. You are responsible for activity on your account. Admins may create learner accounts and set weekly energy. Do not share an account in a way that breaks these Terms or school rules.",
      "We may suspend or close accounts that look compromised, abusive, or created to bypass limits.",
    ], undefined, v),
    block("5. Energy and limits", [
      "Weekly energy is an in-app allowance for text generation. It is not money, not a stored-value facility, and not redeemable for cash. Image generation is not a learner product and is not billed as a separate learner balance.",
      "We may rate-limit generate, quiz, and speech requests to protect the service. Unused energy does not have to roll over.",
    ], undefined, v),
    block("6. Acceptable use", [
      "You agree not to:",
    ], [
      "Upload material you do not have the right to use (including most commercial textbooks, leaked exam papers, or other people’s personal data).",
      "Upload illegal content, malware, or sexual content involving minors.",
      "Try to break into the service, scrape it aggressively, bypass energy or rate limits, or reverse engineer other users’ data.",
      "Use generation to harass, cheat in a way your school forbids, or produce spam.",
      "Submit public community decks that are off-topic, harmful, or clearly copyright-infringing.",
    ], v),
    block("7. Your content", [
      "You keep whatever rights you already have in text and files you upload. You grant {operator} a limited licence to store, process, display, and send that content to the AI and storage providers needed to run {product} for you — including generating cards, licensed-image lookup, speech, sharing you turn on, and community listing you request.",
      "You confirm you have the rights to upload that material and to grant this licence.",
    ], undefined, v),
    block("8. Community packs and pictures", [
      "Encyclopedia and other seed packs are provided for study. Licensed photos stay under their original licence (for example CC BY or CC BY-SA). You must keep credits if you reuse those pictures outside the app.",
      "AI-generated community art is labelled “AI-generated”. It is not a photograph of a real person or a substitute for a rights-cleared textbook figure.",
    ], undefined, v),
    block("9. AI output", [
      "Flashcards, quizzes, hints, and related text are produced by AI and may be incomplete, biased, outdated, or wrong. {product} is a study aid, not a teacher, examiner, or professional adviser. Always check important facts against your course materials before exams or any high-stakes use.",
      "We do not warrant that a deck will match a particular syllabus (including HKDSE) or that quiz distractors will always be perfect, though we aim for plausible same-topic choices.",
    ], undefined, v),
    block("10. Sharing and embeds", [
      "If you create a share or embed link, you are responsible for who you give it to. Anyone with an unlisted or public link may study that deck. Signed-in users may save progress on shared decks.",
    ], undefined, v),
    block("11. Availability", [
      "We may change, suspend, or stop features (including models, community packs, or energy grants). We are not liable for downtime of {hosting}, Supabase, OpenRouter, or other processors.",
    ], undefined, v),
    block("12. Disclaimers and liability", [
      "The service is provided “as is” and “as available” to the fullest extent permitted by the laws of {jurisdiction}. We disclaim implied warranties of merchantability, fitness for a particular purpose, and non-infringement where we are allowed to.",
      "To the maximum extent permitted, {operator} is not liable for indirect or consequential loss, lost marks, failed exams, or decisions made on AI-generated cards. Our total liability for claims arising out of the service is limited to zero, because {product} is provided without a cash fee to learners, except where {jurisdiction} law says we cannot limit liability (including death or personal injury caused by negligence, or fraud).",
    ], undefined, v),
    block("13. Indemnity", [
      "If your upload or public deck causes a claim against us (for example copyright or misuse of personal data), you will indemnify {operator} for reasonable losses and legal costs to the extent permitted by law.",
    ], undefined, v),
    block("14. Changes to these Terms", [
      "We may update these Terms. The “Last updated” date will change. If you keep using {product} after that, you accept the new Terms.",
    ], undefined, v),
    block("15. Contact and law", [
      "Questions: {email}. Governing law and courts: {jurisdiction}. The English version of these Terms prevails.",
    ], undefined, v),
  ];
}

export type CookieRow = {
  name: string;
  purpose: string;
  duration: string;
};

export function cookieRows(v: LegalValues): CookieRow[] {
  return [
    {
      name: "better-auth.session_token (and related Better Auth cookies)",
      purpose: "Keep you signed in with email/password or a passkey.",
      duration: "Session / as set by Better Auth (typically weeks).",
    },
    {
      name: v.localeCookie,
      purpose: "Remember the interface language you picked.",
      duration: "About 1 year.",
    },
    {
      name: "Clerk cookies (__session, __client_uat, and similar), if Clerk is enabled",
      purpose: "Optional hosted or social sign-in.",
      duration: "As described in Clerk’s cookie documentation.",
    },
  ];
}

export function cookiesBlocks(v: LegalValues): LegalBlock[] {
  return [
    block("1. How we use cookies", [
      "{product} uses essential cookies and similar storage so the app can sign you in and remember language. We do not set advertising or cross-site tracking cookies, and we do not sell browsing data for ads.",
      "Because these cookies are required to run the service you asked for (sign-in and language), we do not show a separate marketing-cookie banner.",
    ], undefined, v),
    block("2. Cookies we set", [
      "The table on this page lists the main cookies. Names can vary slightly by browser or library version.",
    ], undefined, v),
    block("3. Local storage", [
      "The browser may store study-a-muted so Speak stays quiet if you turned sound off. That stays on your device and is not sent to us as a profile.",
    ], undefined, v),
    block("4. Third parties", [
      "{hosting} may set technical cookies on preview or production hosts to run the deployment. Supabase Storage is called from our server with secret keys; it does not set an ad cookie on your browser for {product}.",
      "If you generate cards, your study text goes to OpenRouter (cloud) as a server-side API call, not as a cookie. Wikimedia Commons and Openverse see a server-side image search, not your login cookie.",
    ], undefined, v),
    block("5. Managing cookies", [
      "You can delete cookies in your browser. Signing out clears the Better Auth session. Blocking all cookies will usually stop sign-in from working. Language may reset to English if {localeCookie} is blocked.",
    ], undefined, v),
    block("6. More information", [
      "See the Privacy Policy for how account and study data are used. Contact: {email}.",
    ], undefined, v),
  ];
}
