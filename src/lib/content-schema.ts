import type { ContentPageKey, PageContent } from "./types";

export type ContentFieldType =
  | "text"
  | "textarea"
  | "paragraphs"
  | "sections"
  | "faqs"
  | "steps";

export interface ContentFieldDef {
  key: string;
  label: string;
  type: ContentFieldType;
  help?: string;
}

export interface ContentPageDef {
  key: ContentPageKey;
  label: string;
  path: string;
  fields: ContentFieldDef[];
}

export const CONTENT_SCHEMA: ContentPageDef[] = [
  {
    key: "home",
    label: "Home",
    path: "/",
    fields: [
      { key: "heroEyebrow", label: "Hero eyebrow", type: "text" },
      { key: "heroTitle", label: "Hero headline", type: "text" },
      { key: "heroTitleAccent", label: "Hero headline accent", type: "text" },
      { key: "heroIntro", label: "Hero introduction", type: "textarea" },
      { key: "heroNote", label: "Hero note", type: "text" },
      { key: "collectionHeading", label: "Collection heading", type: "text" },
      { key: "collectionIntro", label: "Collection introduction", type: "textarea" },
      { key: "storyHeading", label: "Story heading", type: "text" },
      { key: "storyBody", label: "Story paragraphs", type: "paragraphs" },
      { key: "processHeading", label: "Process heading", type: "text" },
      { key: "processIntro", label: "Process introduction", type: "textarea" },
      { key: "giftingHeading", label: "Gifting heading", type: "text" },
      { key: "giftingIntro", label: "Gifting introduction", type: "textarea" },
      { key: "finalCtaHeading", label: "Final call to action heading", type: "text" },
      { key: "finalCtaBody", label: "Final call to action body", type: "textarea" },
      { key: "finalCtaLabel", label: "Final call to action label", type: "text" },
    ],
  },
  {
    key: "collection",
    label: "Chikki Collection",
    path: "/collection",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "intro", label: "Introduction", type: "textarea" },
      { key: "note", label: "Note under the collection", type: "textarea" },
    ],
  },
  {
    key: "story",
    label: "Our Story",
    path: "/our-story",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "intro", label: "Introduction", type: "textarea" },
      { key: "storyBody", label: "Story paragraphs", type: "paragraphs" },
      { key: "foundersHeading", label: "Founders heading", type: "text" },
      { key: "foundersBody", label: "Founders paragraphs", type: "paragraphs" },
      { key: "timelineHeading", label: "Timeline heading", type: "text" },
      { key: "timelineIntro", label: "Timeline introduction", type: "text" },
      {
        key: "timeline",
        label: "Timeline entries",
        type: "steps",
        help: "One milestone each. Put the year or period in Note — it shows as the marker.",
      },
      { key: "closing", label: "Closing note", type: "textarea" },
    ],
  },
  {
    key: "process",
    label: "Handmade Process",
    path: "/process",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "intro", label: "Introduction", type: "textarea" },
      { key: "steps", label: "Process steps", type: "steps" },
      { key: "closing", label: "Closing note", type: "textarea" },
    ],
  },
  {
    key: "gifting",
    label: "Bulk & Corporate Gifting",
    path: "/gifting",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "intro", label: "Introduction", type: "textarea" },
      { key: "body", label: "Body paragraphs", type: "paragraphs" },
      { key: "sections", label: "Audience sections", type: "sections" },
      { key: "closing", label: "Closing note", type: "textarea" },
    ],
  },
  {
    key: "faqs",
    label: "FAQs",
    path: "/faqs",
    fields: [
      { key: "title", label: "Page title", type: "text" },
      { key: "intro", label: "Introduction", type: "textarea" },
      { key: "faqs", label: "Questions and answers", type: "faqs" },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    path: "/contact",
    fields: [
      { key: "title", label: "Page title", type: "text" },
      { key: "intro", label: "Introduction", type: "textarea" },
      { key: "responseNote", label: "Response note", type: "textarea" },
      { key: "formNote", label: "Note above the form", type: "textarea" },
      { key: "whatsappNote", label: "WhatsApp note", type: "textarea" },
    ],
  },
  {
    key: "privacy",
    label: "Privacy Policy",
    path: "/privacy",
    fields: [
      { key: "title", label: "Page title", type: "text" },
      { key: "updated", label: "Last updated", type: "text" },
      { key: "sections", label: "Policy sections", type: "sections" },
    ],
  },
  {
    key: "terms",
    label: "Terms",
    path: "/terms",
    fields: [
      { key: "title", label: "Page title", type: "text" },
      { key: "updated", label: "Last updated", type: "text" },
      { key: "sections", label: "Terms sections", type: "sections" },
    ],
  },
];

export function pageDef(page: ContentPageKey) {
  const found = CONTENT_SCHEMA.find((p) => p.key === page);
  if (!found) throw new Error(`Unknown content page: ${page}`);
  return found;
}

export const DEFAULT_CONTENT: Record<ContentPageKey, PageContent> = {
  home: {
    heroEyebrow: "Gud ki mithaas, Ghee ki richness.",
    heroTitle: "Chikki,",
    heroTitleAccent: "cut by hand.",
    heroIntro:
      "Seven varieties made by sisters Gopi and Himani in a family kitchen in Ahmedabad — pure jaggery and cow ghee, without added refined sugar or glucose.",
    heroNote:
      "Prices are shared directly. Ask us about the collection, packaging or a bulk order.",
    collectionHeading: "The collection",
    collectionIntro:
      "Seven varieties, each with its own character — some nuttier, some softer, all made by hand.",
    storyHeading: "Two sisters, one kitchen",
    storyBody: [
      "GH Chikkis began with a simple family habit: making chikki for the people around us. What started in a home kitchen became a collection of varieties, shared with families, shops and businesses in and around Ahmedabad.",
      "Gopi Shah and Himani Shah are the people behind the recipes, the wrapping and the decisions.",
      "We are a homemade brand, not a factory. Every order is made with hands, time and attention — and the details are best confirmed with us directly.",
    ],
    processHeading: "From the pour to the cut",
    processIntro:
      "Chikki is a study in timing. These are the stages of our kitchen: heat, patience, pressure and a clean cut.",
    giftingHeading: "Made to be given",
    giftingIntro:
      "From a box for a festival to a considered corporate gift, we work directly with you on varieties, packaging and quantities.",
    finalCtaHeading: "Tell us what you need",
    finalCtaBody:
      "Share the variety, quantity and date you have in mind. We will confirm availability, packaging and price with you directly.",
    finalCtaLabel: "Start an enquiry",
  },
  collection: {
    eyebrow: "The collection",
    title: "Seven varieties. One family kitchen.",
    intro:
      "Choose a variety to see its character and packaging. Prices are not shown online; ask us on WhatsApp or through the enquiry form and we will share current details.",
    note: "Packaging and custom weights are confirmed with you before an order is accepted.",
  },
  story: {
    eyebrow: "Our story",
    title: "A home kitchen, kept at the centre.",
    intro:
      "GH Chikkis is a family-run, homemade chikki brand in Ahmedabad. These are the facts of our story — the rest is best told directly.",
    storyBody: [
      "GH Chikkis is run by sisters Gopi Shah and Himani Shah, from the same kitchen where the first batch was made.",
      "The work began at home, and home is still the centre of it. The kitchen is where the recipes are made, the orders are packed and the standards are set.",
      "We make chikki by hand. We do not present ourselves as a factory, a showroom or a large operation. We are a family kitchen, and we like it that way.",
    ],
    foundersHeading: "Gopi & Himani",
    foundersBody: [
      "Gopi Shah and Himani Shah are sisters who share the work of running GH Chikkis, from the kitchen to the people who order from us.",
      "If you have a question about a variety, packaging or a bulk order, you are speaking to the family.",
    ],
    timelineHeading: "Our Journey",
    timelineIntro: "A journey of tradition, trust and growth.",
    timeline: [
      {
        note: "2018",
        title: "The Beginning",
        body: "GH Chikkis began with a simple vision: bringing the authentic taste of homemade chikki to every home, starting with Ahmedabad.",
      },
      {
        note: "2019–2020",
        title: "Building Trust",
        body: "Gradually expanded our customer base across Ahmedabad, building lasting relationships through quality and consistency.",
      },
      {
        note: "2021",
        title: "Growing Through Challenges",
        body: "Continued serving our customers through challenging times, reaching approximately 1.5 tonnes in production.",
      },
      {
        note: "2022–2023",
        title: "Expanding Horizons",
        body: "Extended our reach beyond Ahmedabad, delivering to multiple cities and states, including Mumbai and Bengaluru.",
      },
      {
        note: "2024",
        title: "A New Milestone",
        body: "Achieved approximately 5–6 tonnes in production, marking a significant step in our growth journey.",
      },
      {
        note: "2025",
        title: "Across Borders",
        body: "Took the taste of GH Chikkis international, fulfilling orders and reaching customers in Canada, the United Kingdom, the United States and New Zealand.",
      },
      {
        note: "Today",
        title: "Growing With Tradition",
        body: "Continuing our journey with the same homemade recipes, carefully selected ingredients and commitment to quality, one order at a time.",
      },
    ],
    closing:
      "For current varieties, packaging and availability, ask us directly. The kitchen changes with the season and with what has been made that week.",
  },
  process: {
    eyebrow: "The handmade process",
    title: "Heat, patience, pressure, cut.",
    intro:
      "Every variety passes through the same rhythm. The details change; the attention does not.",
    steps: [
      {
        title: "The cook",
        body: "The base is brought to the right point over heat. The window is narrow; this stage is judged by eye, by aroma and by experience.",
      },
      {
        title: "The pour",
        body: "The hot base is poured over the nuts or other ingredients and spread quickly, before it begins to set.",
      },
      {
        title: "The press",
        body: "The mixture is pressed and rolled to an even thickness. An uneven press shows up later, in the bite.",
      },
      {
        title: "The cut",
        body: "While the set is still warm, it is marked and cut. The clean edge is the part we check first.",
      },
      {
        title: "The wrap",
        body: "Once cool, the pieces are broken along the cuts, sorted and packed. Every box is checked by hand.",
      },
    ],
    closing:
      "The illustrations on this page are a visual guide to the stages, not photographs of a specific batch. Ask us if you would like to see the current process directly.",
  },
  gifting: {
    eyebrow: "Bulk & corporate gifting",
    title: "A considered gift, made by hand.",
    intro:
      "We work directly with retailers, businesses and families on bulk and festive orders. Tell us the occasion, quantity and date, and we will confirm what is possible.",
    body: [
      "Gifting orders are planned with you: varieties, packaging, quantities and delivery or collection. We do not publish prices online because every bulk order is different.",
      "For corporate orders, we can discuss packing and presentation directly. We do not claim certifications or turnaround times we cannot meet — we will confirm both before you commit.",
    ],
    sections: [
      {
        heading: "Retailers",
        body: [
          "Stock a handmade chikki range from a family kitchen in Ahmedabad. Talk to us about varieties, packaging and repeat orders.",
        ],
      },
      {
        heading: "Corporate gifting",
        body: [
          "Festive or client gifting, planned around your quantity and date. We will confirm packaging and delivery options with you.",
        ],
      },
      {
        heading: "Festive orders",
        body: [
          "Diwali, weddings and family occasions. Share your date early so we can confirm availability.",
        ],
      },
      {
        heading: "Bulk & custom weights",
        body: [
          "Need a specific weight or mix? Ask. We will tell you what we can make and what the lead time is.",
        ],
      },
    ],
    closing:
      "Use the enquiry form or WhatsApp. The more you tell us about quantity and date, the more useful our reply will be.",
  },
  faqs: {
    title: "Questions, answered.",
    intro:
      "If your question is not here, ask us directly — we would rather give you a real answer.",
    faqs: [
      {
        question: "How do I place an order?",
        answer:
          "Use the enquiry form on this website or message us on WhatsApp. We confirm availability, packaging, price and collection or delivery directly with you. There is no online checkout.",
      },
      {
        question: "Why are prices not shown?",
        answer:
          "Every order can differ by variety, packaging and quantity. We share current prices directly so you have the right information for what you need.",
      },
      {
        question: "What varieties do you make?",
        answer:
          "Our current collection consists of Groundnut Chikki, White Til Chikki, Black Til Chikki, Dryfruit Chikki, Coconut Chikki, Mamra Chikki and Daliya Chikki. Ask us if you are looking for something not listed.",
      },
      {
        question: "Can I choose a custom weight?",
        answer:
          "We can discuss custom weights and packaging. Tell us what you need and we will confirm what is possible and the price before you order.",
      },
      {
        question: "Do you deliver?",
        answer:
          "We arrange home collection, porter or courier depending on the order. We confirm the method, timing and any charge with you in advance.",
      },
      {
        question: "Do you make corporate or bulk orders?",
        answer:
          "Yes. Tell us the quantity, occasion and date through the gifting enquiry, and we will confirm details directly.",
      },
      {
        question: "Can you tell me about ingredients and allergens?",
        answer:
          "Please ask us for the current ingredients and allergen information for the specific variety you are considering. We do not publish unverified details.",
      },
      {
        question: "How should I store chikki?",
        answer:
          "Store in a cool, dry place away from direct sunlight and heat to prevent the jaggery from softening or melting.",
      },
      {
        question: "Can I visit the kitchen?",
        answer:
          "GH Chikkis operates from a family kitchen, not a public showroom. Please contact us before planning a visit so we can tell you whether it is possible.",
      },
      {
        question: "Do you ship outside Ahmedabad?",
        answer:
          "Yes! We deliver across all Indian states and select international destinations. Shipping charges are borne by the customer and vary by location.",
      },
      {
        question: "How do I pay?",
        answer:
          "We accept both cash and online payments for your convenience. Payment details will be shared when confirming your order.",
      },
    ],
  },
  contact: {
    title: "Let's talk chikki.",
    intro:
      "Tell us what you are looking for — a variety, a quantity, a date or a gift. We will reply with the details you need.",
    responseNote:
      "We reply during business hours. If your enquiry is urgent, use WhatsApp where the number is shown.",
    formNote:
      "This form creates an enquiry, not an order. We will confirm everything with you directly.",
    whatsappNote: "WhatsApp is the quickest way to reach the kitchen.",
  },
  privacy: {
    title: "Privacy policy",
    updated: "Last updated: 30/10/2026",
    sections: [
      {
        heading: "What we collect",
        body: [
          "When you send an enquiry we keep the name, quantity and message you type. The enquiry form no longer asks for your phone number, email address or expected date — if you share any of those with us later, we record them alongside the enquiry so we can reply.",
          "If you become a customer, we may also keep your address, company details, order history, payment records and notes needed to run the business.",
        ],
      },
      {
        heading: "Why we use it",
        body: [
          "To reply to your enquiry, prepare and deliver orders, keep invoices and payment records, and run the business. We do not sell your information.",
        ],
      },
      {
        heading: "WhatsApp",
        body: [
          "If you give us permission, we may contact you on WhatsApp about your enquiry or order. You can withdraw that permission at any time by telling us.",
          "Automated messages are only sent where we have a recorded permission and a valid message setup.",
        ],
      },
      {
        heading: "Staff access",
        body: [
          "Only authorised team members can access customer and order data. Access is limited by role and recorded in our audit log.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "If analytics is enabled, we use Google Analytics 4 to understand how the website is used. It is loaded only after you accept analytics cookies.",
          "We do not send your name, phone number, email address, order details or invoice numbers to analytics.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "The website uses a necessary session cookie for staff sign-in. Analytics cookies are optional and are loaded only with your consent.",
        ],
      },
      {
        heading: "Retention and backups",
        body: [
          "Business records such as invoices and payment records are kept as long as needed for the business and applicable obligations. Backups are encrypted and retained for up to 30 days.",
        ],
      },
      {
        heading: "Service providers",
        body: [
          "We use service providers for hosting, database, media storage, Google sign-in for staff and, where enabled, WhatsApp messaging and analytics. They process data on our behalf under their terms.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can ask us to correct your contact details or to stop WhatsApp contact. Use the contact form on this website.",
          "We may need to keep records that we are required to keep for business or legal reasons.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms",
    updated: "Last updated: 30/10/2026",
    sections: [
      {
        heading: "About this website",
        body: [
          "This website introduces GH Chikkis and lets you send an enquiry. It does not sell products online, take payment or create a binding order.",
        ],
      },
      {
        heading: "Enquiries and orders",
        body: [
          "An enquiry is not an order. An order is confirmed only when GH Chikkis confirms availability, price, packaging and collection or delivery directly with you.",
        ],
      },
      {
        heading: "Prices and availability",
        body: [
          "Prices and availability are shared directly and may change. Nothing on this website is a price list or an offer for sale.",
        ],
      },
      {
        heading: "Product information",
        body: [
          "Product descriptions are provided for general information. For current ingredients, allergens and storage guidance, ask us before ordering.",
          "Nothing on this website is medical or nutritional advice.",
        ],
      },
      {
        heading: "Delivery and collection",
        body: [
          "We deliver across all Indian states and to select international destinations. Collection, porter or courier options are confirmed with you before an order is accepted.",
          "Shipping charges are borne by the customer and vary by location. We confirm the amount with you before the order goes out.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "The GH Chikkis name and website content belong to GH Chikkis. Please do not reproduce them without permission.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms. The date at the top shows the latest version.",
        ],
      },
      {
        heading: "Contact",
        body: ["Questions about these terms: use the contact form on this website."],
      },
    ],
  },
};

export function contentPath(page: ContentPageKey) {
  return pageDef(page).path;
}
