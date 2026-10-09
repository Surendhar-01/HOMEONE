-- ============================================================================
-- HOMEONE - seed.sql
-- Reference catalog data (service domains + services) and the in-app copy for
-- the four verification statuses. Idempotent: safe to re-run.
-- ============================================================================

INSERT INTO public.service_domains (domain_name) VALUES
  ('Cleaning Services'),
  ('Electrical Services'),
  ('Plumbing Services'),
  ('Carpentry Services'),
  ('Painting Services'),
  ('AC & Refrigeration'),
  ('Pest Control'),
  ('Home Appliance Repair'),
  ('Gardening & Lawn Care'),
  ('Moving & Packing'),
  ('Interior Design'),
  ('Solar & Energy')
ON CONFLICT (domain_name) DO NOTHING;

-- Services attached to their domain by name so the seed is order-independent.
INSERT INTO public.services (domain_id, service_name)
SELECT d.id, v.service_name
FROM (VALUES
  ('Cleaning Services', 'Deep Cleaning'),
  ('Cleaning Services', 'Kitchen Cleaning'),
  ('Cleaning Services', 'Bathroom Cleaning'),
  ('Cleaning Services', 'Sofa Cleaning'),
  ('Cleaning Services', 'Office Cleaning'),
  ('Electrical Services', 'Fan & Light Installation'),
  ('Electrical Services', 'Wiring & Rewiring'),
  ('Electrical Services', 'MCB & Switchboard Repair'),
  ('Electrical Services', 'Inverter & Stabilizer Service'),
  ('Plumbing Services', 'Leak Detection & Repair'),
  ('Plumbing Services', 'Tap & Faucet Installation'),
  ('Plumbing Services', 'Bathroom Fitting Installation'),
  ('Plumbing Services', 'Drain Cleaning'),
  ('Carpentry Services', 'Furniture Repair'),
  ('Carpentry Services', 'Custom Furniture Work'),
  ('Carpentry Services', 'Door & Window Repair'),
  ('Carpentry Services', 'Modular Kitchen Work'),
  ('Painting Services', 'Interior Painting'),
  ('Painting Services', 'Exterior Painting'),
  ('Painting Services', 'Texture & Wall Art'),
  ('Painting Services', 'Waterproof Painting'),
  ('AC & Refrigeration', 'AC Servicing'),
  ('AC & Refrigeration', 'AC Installation'),
  ('AC & Refrigeration', 'AC Gas Filling'),
  ('AC & Refrigeration', 'Refrigerator Repair'),
  ('AC & Refrigeration', 'Deep Cleaning'),
  ('Pest Control', 'Cockroach Control'),
  ('Pest Control', 'Termite Control'),
  ('Pest Control', 'Bed Bugs Treatment'),
  ('Pest Control', 'Rodent Control'),
  ('Home Appliance Repair', 'Washing Machine Repair'),
  ('Home Appliance Repair', 'Dishwasher Repair'),
  ('Home Appliance Repair', 'Microwave Oven Repair'),
  ('Home Appliance Repair', 'Gas Stove Repair'),
  ('Gardening & Lawn Care', 'Garden Maintenance'),
  ('Gardening & Lawn Care', 'Lawn Mowing'),
  ('Gardening & Lawn Care', 'Planting & Landscaping'),
  ('Moving & Packing', 'Local Shifting'),
  ('Moving & Packing', 'Intercity Moving'),
  ('Moving & Packing', 'Packing & Unpacking'),
  ('Moving & Packing', 'Vehicle Shifting'),
  ('Interior Design', 'Home Interior Design'),
  ('Interior Design', 'False Ceiling Work'),
  ('Interior Design', 'Wardrobe Design'),
  ('Solar & Energy', 'Solar Panel Installation'),
  ('Solar & Energy', 'Solar Panel Maintenance'),
  ('Solar & Energy', 'Inverter Installation')
) AS v(domain_name, service_name)
JOIN public.service_domains d ON d.domain_name = v.domain_name
ON CONFLICT (domain_id, service_name) DO NOTHING;