/**
 * Asset map for the Sunbeam landing page.
 *
 * Every file below lives in /public/img and was verified byte-for-byte
 * against the Framer export in /public/templete/index.html — the hashed
 * filenames are Framer's, kept as-is so they stay traceable to the source.
 */

export const IMG = {
  // ---- hero decorations -------------------------------------------------
  mrPink: "/img/RLU2hsSKDveC2VpoHqketjvTr3s.png", // 485x485 pink arc mascot
  mrBlue: "/img/O6kGvJ0evHtAgal4n8NVHS6uSk.png", // 356x471 blue mascot
  blueCircle: "/img/9yAPstk3mGWwVwWGnAzRbUtJApo.png", // 56px blue dot
  greenSquare: "/img/M2X9pjCJwdQIDSgXeFsJ66UcNM.png", // 73px green diamond

  // The grinning sun. Framer baked a Lottie down to a self-contained SVG
  // (paths + embedded grain textures); reused at hero, orbit and CTA.
  sun: "/img/svg-2.svg",

  // ---- product tab screenshots -----------------------------------------
  tabPlate: "/img/rc75NSt7J17IDJDdESD4BWY5U.jpg", // 2480x1380 violet backing plate
  tabCrm: "/img/ozpIAGYa4ZFp2vouM0eslh9FsHU.png",
  tabInvoice: "/img/7nJ4mHqyaZdeQzxj9x2d1WW6Sc.png",
  tabScheduling: "/img/UAUhtDXVqelk2HvtOWkqeN0m8.png",
  tabProposals: "/img/M0XUwAYEasF4CIHMYD2kfk750I.png",
  tabTasks: "/img/xEW1o4LazXMVXULdDGgNUGf5du8.png",

  // ---- benefit accordion ------------------------------------------------
  benefitIcon1: "/img/LPdufcuk7MyTCls6kV1b0xX47WQ.png",
  benefitIcon2: "/img/KxFf6CHPmeuaZwQtgAu2oMEXDmM.png",
  benefitIcon3: "/img/vEe4cNal39f8oqwUCKk5JfVTYo.png",
  benefitShot1: "/img/t8P00E5cZjqMUE2I7Xiq3PqjJts.jpg",
  benefitShot2: "/img/MPQNyOLhm4fI132pePtZnULO4.png",
  benefitShot3: "/img/6Hnxo5ryqpBdNaWRqhgMg4.png",

  // ---- feature cards ----------------------------------------------------
  featureClients: "/img/y7ButnPqoHClAUMwzF6HrUNKk.jpg", // task board
  featureProjects: "/img/e2Jp8RyhebvUfizfkcC3LdY1Sw0.jpg", // projects table
  featureFinance: "/img/0d3S2AESGnOcvHcfd3slO6tlK80.jpg", // revenue dashboard

  // ---- testimonial avatars ---------------------------------------------
  avatar1: "/img/9Ish4xInFdtjW8PTKtBGBbRSVC4.png",
  avatar2: "/img/GWdQYeo0KMGKx9BTQe9vI8uE7PQ.jpg",
  avatar3: "/img/dcEeAoKpxW1uvSTh8HM1ESKcy8k.jpg",
  avatar4: "/img/cGHhRXstSZxKlN7ZWdWiXEGEhk.jpg",
  avatar5: "/img/Zt3c9uG3zrz1ZvL0vAix7vnbjw.jpg",
  avatar6: "/img/EzWJxcU5txzcr5EjUz4PEBtjk.jpg",

  // ---- case study cards -------------------------------------------------
  caseLaura: "/img/gDg4yQYGKdSICQgDRS2PkT3iLE.jpg",
  caseNextWave: "/img/TGZEGqpJzUykWPJ3Kl865iEHM.jpg",
  caseSpectrum: "/img/veYaU0ZIJc33OTPXFFIGmS4SEg.jpg",

  // ---- closing CTA + footer --------------------------------------------
  mrViolet: "/img/QD2NkGq2ReBFZuKx3auIinfobU.png",
  ctaCloud: "/img/ai0VvHqHujcuSlk64cKXqCk9oIU.png",
  ctaBlue: "/img/h3gaVIQqIusArb6rhZf5RhcLaRc.png",
  footerCloud: "/img/KT6DMEdx3GX9DMKyuciPrJEdIc.png",
} as const;
