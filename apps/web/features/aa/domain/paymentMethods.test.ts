import assert from "node:assert/strict";
import test from "node:test";
import { decodePaymentMethods, encodePaymentMethods } from "./paymentMethods";

test("one existing payment method remains readable and editable", () => {
  assert.deepEqual(decodePaymentMethods("Revolut @lou"), ["Revolut @lou"]);
  assert.equal(encodePaymentMethods([" Revolut @lou "]), "Revolut @lou");
  assert.deepEqual(decodePaymentMethods(null), []);
});

test("multiple methods round-trip as separate copyable values", () => {
  const methods = ["Revolut @lou", "IBAN FR76 1234", "PayPal lou@example.com"];
  const stored = encodePaymentMethods(methods);
  assert.deepEqual(decodePaymentMethods(stored), methods);
  assert.deepEqual(decodePaymentMethods(encodePaymentMethods(methods.slice(1))), methods.slice(1));
  assert.equal(encodePaymentMethods([]), null);
});

test("payment methods reject control characters and values that exceed the existing column", () => {
  assert.throws(() => encodePaymentMethods(["Revolut @lou", "IBAN\nFR76"]), /INVALID/);
  assert.throws(() => encodePaymentMethods(["Revolut @lou", "x".repeat(150)]), /INVALID/);
  assert.deepEqual(decodePaymentMethods("AA1:not-json"), ["AA1:not-json"]);
});
