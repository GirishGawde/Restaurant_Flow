# Design Decisions and Open Items

## Decisions made
| Topic | Decision |
|---|---|
| Discounts | Live on the bill, one promotion per order, `promotion` table owned by Sakshi. Ayush's screen 9 calls her function |
| Bill creation | A bill row is created when an order opens and recalculated when items change (Sakshi's triggers) |
| Tickets | Created when an item changes from draft to sent (Send to Kitchen), by Diya's trigger. One ticket row per order item; the kitchen board groups them by order |
| Tax | Prices include tax (screens 13 and 15), so no tax column or line |
| Passwords | Stored by Supabase Auth, not in our tables |
| Login | By username; the API maps it to the staff email; the chosen role tile must match the real role |
| Table cleaning | After payment the table becomes `needs_cleaning`; a waiter marks it clean |
| Menu status | `active`, `sold_out`, `inactive` instead of a yes/no flag |
| Edit lock | The order records who holds the lock and since when; waiting waiters time out after 30 seconds |
| Frozen orders | An order whose bill is requested or open cannot be edited |
| History lists | Screens 7 and 13 read `v_order_history`, built from the audit log (Girish) |
| Rejected payment | Flask writes the audit entry for a rejected duplicate payment in a separate transaction, because the failed one is rolled back |
| Refresh | Kitchen display and dashboard poll every 10 seconds |
| RLS | Enabled on every table with no policies until `07_security_rls.sql`. Flask's connection bypasses RLS, so Flask checks roles too |
| Function name | `current_staff_role()` (not `current_role()`, which is reserved) |
| Stations | Owned by Diya; draft list Grill, Cold, Oven, Bar |

## Figma inconsistencies to fix
- **Menu items:** screen 17 uses Paneer Tikka, Dal Makhani, Butter Naan; screens 6, 7 and 11 to 15 use Grilled Salmon, Caesar Salad, Lemonade. The seed data in `03_menu_admin.sql` follows screens 6 to 15. Update screen 17.
- **Categories:** screen 17 has Starters, Breads, Mains, Desserts, Beverages; screen 6 has Starters, Mains, Sides, Drinks, Desserts. Seed follows screen 6.
- **Stations:** screen 17 lists Grill, Salad, Tandoor, Main, Dessert, Beverage; screen 12 shows Grill, Cold, Oven, Bar. Seed follows screen 12.
- **People:** the chef is K. Rao on screens 18 and 20 but R. Patel on screens 11 and 12, while R. Patel is a waiter on 16, 18 and 19. The cashier is S. Gupta on 18 and 20 but M. Rossi on 13 to 15.
- **Orders and tables:** order numbers and tables on screen 11 do not match screen 16.
- **Targets:** kitchen target is 20 minutes on screens 16 and 19 but 15 on screen 12. Stored in `app_setting` (currently 20).
- **Role name:** headers say Manager, page labels say Admin. Use admin.
- **Role label:** login tile says Kitchen Staff, headers say Chef. Stored role is `chef`.

## Open items
- [ ] Agree final station list and menu categories
- [ ] Agree staff names for seed data
- [ ] Confirm kitchen target time
- [ ] Design: mark table clean, table reservation, promotion management, two-waiter demo screen
- [ ] Decide styling approach for the frontend (suggested: plain CSS with design tokens from Figma)
- [ ] Decide whether Supabase Realtime replaces polling

## How to add a decision
Add a row to the table above with the topic and what was decided, and tell the group. If a decision changes a table, open an issue for the table's owner first.
