import { describe, it, expect } from "vitest";
import {
  parseCsv,
  mapHeaders,
  parseSheet,
  extractSheetId,
  csvExportUrl,
  normalizePhone,
  parsePrice,
  rowFingerprint,
} from "@/lib/sheetImport";

describe("extractSheetId", () => {
  it("extrait l'id d'une URL standard", () => {
    const r = extractSheetId(
      "https://docs.google.com/spreadsheets/d/1HY-a_MnCBelaxG5dKbNBEnRIlk9yUUymbWTRTeNbJv8/edit#gid=123"
    );
    expect(r?.sheetId).toBe("1HY-a_MnCBelaxG5dKbNBEnRIlk9yUUymbWTRTeNbJv8");
    expect(r?.gid).toBe("123");
  });
  it("refuse une URL non-Sheets", () => {
    expect(extractSheetId("https://example.com/feuille")).toBeNull();
    expect(extractSheetId("")).toBeNull();
  });
  it("construit l'URL d'export CSV", () => {
    expect(csvExportUrl("ABC", null)).toContain("/d/ABC/export?format=csv");
    expect(csvExportUrl("ABC", "42")).toContain("&gid=42");
  });
});

describe("parseCsv", () => {
  it("gère guillemets, virgules et retours ligne dans les champs", () => {
    const csv = 'a,"b,c","d\ne"\r\n"f""g",h,';
    expect(parseCsv(csv)).toEqual([
      ["a", "b,c", "d\ne"],
      ['f"g', "h", ""],
    ]);
  });
  it("ignore les lignes vides et le BOM", () => {
    const csv = "﻿a,b\n\n,\nc,d\n";
    expect(parseCsv(csv)).toEqual([["a", "b"], ["c", "d"]]);
  });
});

describe("mapHeaders (compatibilité Rapido)", () => {
  it("reconnaît les en-têtes Rapido exacts", () => {
    const { mapping } = mapHeaders(["Nom client", "Téléphone", "Produit", "Prix", "Zone", "Adresse", "Note"]);
    expect(Object.keys(mapping).sort()).toEqual(
      ["address", "fullName", "note", "phone", "price", "product", "zone"].sort()
    );
  });
  it("est insensible à la casse et aux accents", () => {
    const { mapping } = mapHeaders(["CLIENT", "telephone", "ARTICLE", "MONTANT"]);
    expect(mapping.fullName).toBe(0);
    expect(mapping.phone).toBe(1);
    expect(mapping.product).toBe(2);
    expect(mapping.price).toBe(3);
  });
  it("liste les colonnes inconnues sans échouer", () => {
    const { mapping, unmapped } = mapHeaders(["Nom", "Tel", "Couleur préférée"]);
    expect(mapping.fullName).toBe(0);
    expect(unmapped).toEqual(["Couleur préférée"]);
  });
});

describe("normalizePhone", () => {
  it("normalise les formats guinéens", () => {
    expect(normalizePhone("+224 622 111 001")).toBe("622111001");
    expect(normalizePhone("00224622111001")).toBe("622111001");
    expect(normalizePhone("622-111-001")).toBe("622111001");
    expect(normalizePhone("224622111001")).toBe("622111001");
  });
});

describe("parsePrice", () => {
  it("accepte les formats usuels GNF", () => {
    expect(parsePrice("280000")).toBe(280000);
    expect(parsePrice("280 000")).toBe(280000);
    expect(parsePrice("280.000 GNF")).toBe(280000);
    expect(parsePrice("280,000")).toBe(280000);
    expect(parsePrice("")).toBe(0);
    expect(parsePrice("gratuit")).toBe(0);
  });
});

describe("parseSheet", () => {
  const CSV =
    "Nom client,Téléphone,Produit,Prix,Zone,Adresse,Note\n" +
    "Mamadou Diallo,+224 622 111 001,Masque Moto,165000,Ratoma,Carrefour Madina,Livrer le matin\n" +
    "Fatoumata Bah,623222002,Lampe Torche,120000,Matam,,\n" +
    ",,,,,\n" + // ligne vide décorative
    "Sans Téléphone,,Produit X,1000,Zone,,\n"; // téléphone manquant

  it("parse les lignes valides et rejette les invalides avec raison", () => {
    const p = parseSheet(CSV);
    expect(p.missingRequired).toEqual([]);
    expect(p.rows).toHaveLength(2);
    expect(p.rows[0]).toMatchObject({
      fullName: "Mamadou Diallo",
      phone: "622111001",
      product: "Masque Moto",
      price: 165000,
      quantity: 1,
      zone: "Ratoma",
      note: "Livrer le matin",
      rowNumber: 2,
    });
    expect(p.skipped).toHaveLength(1);
    expect(p.skipped[0].reason).toContain("Téléphone");
  });

  it("signale les colonnes requises manquantes", () => {
    const p = parseSheet("Produit,Prix\nX,100\n");
    expect(p.missingRequired.sort()).toEqual(["fullName", "phone"].sort());
    expect(p.rows).toHaveLength(0);
  });

  it("empreintes : identiques pour même contenu, suffixées si ligne dupliquée", () => {
    const dup =
      "Nom client,Téléphone,Produit,Prix\n" +
      "A,622111001,X,1000\n" +
      "A,622111001,X,1000\n";
    const p = parseSheet(dup);
    expect(p.rows[0].externalRef).toMatch(/^SHEET:[0-9a-f]{16}$/);
    expect(p.rows[1].externalRef).toBe(`${p.rows[0].externalRef}#2`);
  });

  it("réordonner les lignes ne change pas les empreintes", () => {
    const a = parseSheet("Nom client,Téléphone,Produit\nA,622111001,X\nB,623222002,Y\n");
    const b = parseSheet("Nom client,Téléphone,Produit\nB,623222002,Y\nA,622111001,X\n");
    const refsA = a.rows.map((r) => r.externalRef).sort();
    const refsB = b.rows.map((r) => r.externalRef).sort();
    expect(refsA).toEqual(refsB);
  });

  it("utilise la colonne Référence si fournie", () => {
    const p = parseSheet("Nom client,Téléphone,Référence\nA,622111001,CMD-42\n");
    expect(p.rows[0].externalRef).toBe("SHEET:CMD-42");
  });

  it("lit la quantité si présente", () => {
    const p = parseSheet("Nom client,Téléphone,Produit,Prix,Quantité\nA,622111001,X,10000,3\n");
    expect(p.rows[0].quantity).toBe(3);
  });
});

describe("rowFingerprint", () => {
  const base = { phone: "622111001", product: "X", price: 1000, quantity: 1, zone: "", address: "", note: "" };
  it("est stable et insensible à la casse du contenu", () => {
    expect(rowFingerprint(base, 1)).toBe(rowFingerprint({ ...base, product: "x" }, 1));
  });
  it("change si le contenu change", () => {
    expect(rowFingerprint(base, 1)).not.toBe(rowFingerprint({ ...base, price: 2000 }, 1));
  });
});
