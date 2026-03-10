# BetAll — Stripe Integration Tickets

## Objetivo
Permitir a los usuarios comprar créditos/BETALL con tarjeta de crédito vía Stripe Checkout embebido.

**Paquetes de créditos:**
| Paquete | Precio | Créditos | BETALL |
|---------|--------|----------|--------|
| Starter | $5 USD | 5,000 | 5,000 |
| Popular | $10 USD | 11,000 | 11,000 |
| Pro | $25 USD | 30,000 | 30,000 |
| Whale | $50 USD | 65,000 | 65,000 |

*(Paquetes más grandes dan bonus: 10%, 20%, 30%)*

---

### Ticket 1: Crear cuenta Stripe + productos
**Prioridad:** 🔴 Alta
- [ ] Crear cuenta Stripe (o usar la de BidAi)
- [ ] Crear 4 productos en Stripe Dashboard (Starter/Popular/Pro/Whale)
- [ ] Crear Price IDs para cada paquete (one-time payment, NOT subscription)
- [ ] Guardar Price IDs en env vars
- [ ] Configurar webhook endpoint en Stripe Dashboard

**Env vars necesarias:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_POPULAR=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_WHALE=price_xxx
```

---

### Ticket 2: Backend — routes/stripe.js
**Prioridad:** 🔴 Alta
**Referencia:** Mutor `routes/billing.js`

- [ ] `POST /api/stripe/checkout` — crear checkout session embebido
  - Recibe: `{ packageId: 'starter'|'popular'|'pro'|'whale' }`
  - Metadata: `user_id`, `package_id`, `credits_amount`
  - Mode: `payment` (one-time, no subscription)
  - UI mode: `embedded` (modal, no redirect)
  - Return URL: frontend `/wallet?session_id={CHECKOUT_SESSION_ID}`
- [ ] `POST /api/stripe/webhook` — procesar eventos
  - `checkout.session.completed` → acreditar créditos al usuario
  - Validar webhook signature con `STRIPE_WEBHOOK_SECRET`
  - Idempotency: check si ya se procesó (evitar doble crédito)
- [ ] `GET /api/stripe/session-status` — verificar estado post-checkout
- [ ] Montar webhook ANTES de `express.json()` (necesita `express.raw()`)
- [ ] Registrar transacción en tabla `transactions`

---

### Ticket 3: Backend — middleware de Stripe webhook
**Prioridad:** 🔴 Alta

- [ ] En `server.js`: montar `express.raw({type: 'application/json'})` en `/api/stripe/webhook` ANTES del `express.json()` global
- [ ] Verificar signature: `stripe.webhooks.constructEvent(body, sig, webhookSecret)`
- [ ] Acreditar créditos:
  ```js
  // En checkout.session.completed handler:
  const { user_id, credits_amount } = session.metadata;
  await supabase.from('profiles')
    .update({ balance_credits: profile.balance_credits + parseInt(credits_amount) })
    .eq('id', user_id);
  await supabase.from('transactions').insert({
    user_id, type: 'purchase', amount: parseInt(credits_amount),
    description: `Compra de ${credits_amount} créditos via Stripe`
  });
  ```

---

### Ticket 4: Frontend — componente BuyCredits.jsx
**Prioridad:** 🔴 Alta

- [ ] Componente con las 4 tarjetas de paquetes
- [ ] Diseño KuCoin-style: cards con borde, highlight en "Popular"
- [ ] Badge de bonus en paquetes grandes (+10%, +20%, +30%)
- [ ] Botón "Comprar" → llama `POST /api/stripe/checkout`
- [ ] Integrar `@stripe/react-stripe-js` + `EmbeddedCheckoutProvider`
- [ ] Modal de checkout embebido (no redirect)
- [ ] Post-pago: redirect a `/wallet?session_id=X`, verificar status, mostrar toast de éxito

**Dependencias npm:**
```
@stripe/stripe-js
@stripe/react-stripe-js
```

---

### Ticket 5: Frontend — integrar en página Wallet
**Prioridad:** 🟡 Media

- [ ] Agregar sección "Comprar Créditos" arriba del TokenSwap
- [ ] Tabs: "Comprar con Tarjeta" | "Depositar BETALL" | "Swap Crypto"
- [ ] Mostrar historial de compras en transacciones
- [ ] Skeleton loading mientras carga

---

### Ticket 6: Frontend — Checkout Success
**Prioridad:** 🟡 Media

- [ ] Detectar `?session_id=` en URL de Wallet
- [ ] Llamar `GET /api/stripe/session-status?session_id=X`
- [ ] Si `status=complete`: toast success + refresh profile + limpiar URL
- [ ] Si `status=expired`: toast error

---

### Ticket 7: Opción de mintear BETALL on-chain post-compra
**Prioridad:** 🟢 Baja (futuro)

- [ ] Después de acreditar créditos, ofrecer opción de "Retirar a wallet"
- [ ] Ya existe el endpoint `/api/wallet/withdraw` que mintea BETALL
- [ ] Solo necesita UI: botón "Convertir créditos a BETALL"

---

### Ticket 8: MercadoPago (futuro)
**Prioridad:** 🟢 Baja

- [ ] Crear cuenta MercadoPago developer
- [ ] Integrar SDK de MercadoPago
- [ ] Misma lógica que Stripe pero con MP Checkout Pro
- [ ] Soporte ARS, BRL, MXN

---

### Ticket 9: Uniswap Widget embed (futuro)
**Prioridad:** 🟢 Baja

- [ ] Embeber Uniswap Swap Widget en tab "Swap Crypto"
- [ ] Pre-configurar token output = BETALL
- [ ] Pool ya existe: `0x1a77ca8C410943dfD7f8973c5C610Bf1bF527Eab`

---

## Orden de ejecución
1. **Ticket 1** → Stripe Dashboard setup
2. **Ticket 2 + 3** → Backend (checkout + webhook)
3. **Ticket 4 + 5 + 6** → Frontend (UI + checkout modal + success)
4. **Ticket 7** → BETALL mint post-compra
5. **Ticket 8 + 9** → MercadoPago + Uniswap (fase 2)

## Notas técnicas
- `express.raw()` ANTES de `express.json()` para webhook route
- Checkout embebido (modal), NO redirect a Stripe hosted page
- One-time payments, NO subscriptions (son paquetes de créditos)
- Frontend necesita `VITE_STRIPE_PUBLISHABLE_KEY` env var
- Webhook en producción: `https://API_URL/api/stripe/webhook`
