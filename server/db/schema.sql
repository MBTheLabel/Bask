-- ============================================================
-- BASK DATABASE SCHEMA
-- MySQL 8.0+
-- Run: mysql -u root -p bask_db < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS bask_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bask_db;

-- ─── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  membership_tier ENUM('Standard', 'Elite') NOT NULL DEFAULT 'Standard',
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  has_selected_membership TINYINT(1) NOT NULL DEFAULT 0,
  nude_friendly TINYINT(1) NOT NULL DEFAULT 0,
  dietary_restrictions JSON DEFAULT (JSON_ARRAY()),
  travel_interests JSON DEFAULT (JSON_ARRAY()),
  profile_photo_url VARCHAR(500) DEFAULT NULL,
  stripe_customer_id VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_membership (membership_tier)
) ENGINE=InnoDB;

-- ─── Curated Trips ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS curated_trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_person DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  full_itinerary LONGTEXT DEFAULT NULL,
  tags JSON DEFAULT (JSON_ARRAY()),
  image_url VARCHAR(500) DEFAULT NULL,
  is_past TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  max_guests INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_is_past (is_past),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- ─── Trip Requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  destination VARCHAR(255) NOT NULL,
  departure_date_preferred DATE DEFAULT NULL,
  return_date_preferred DATE DEFAULT NULL,
  budget_range VARCHAR(50) NOT NULL,
  group_type VARCHAR(50) NOT NULL,
  occasion VARCHAR(100) NOT NULL,
  travel_style VARCHAR(100) NOT NULL,
  interests JSON DEFAULT (JSON_ARRAY()),
  additional_notes TEXT DEFAULT NULL,
  status ENUM('pending','reviewing','booked','cancelled') NOT NULL DEFAULT 'pending',
  admin_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── Concierge Requests ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS concierge_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  urgency ENUM('low','medium','high','emergency') NOT NULL DEFAULT 'low',
  description TEXT NOT NULL,
  status ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  admin_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_urgency (urgency),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── Bookings (Curated Trip Requests to Join) ─────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  curated_trip_id INT NOT NULL,
  status ENUM('pending','confirmed','declined','cancelled') NOT NULL DEFAULT 'pending',
  guest_count INT NOT NULL DEFAULT 1,
  special_requests TEXT DEFAULT NULL,
  admin_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (curated_trip_id) REFERENCES curated_trips(id) ON DELETE CASCADE,
  UNIQUE KEY unique_booking (user_id, curated_trip_id),
  INDEX idx_user_id (user_id),
  INDEX idx_trip_id (curated_trip_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── Partner Homes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_homes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  nightly_rate DECIMAL(10,2) NOT NULL,
  max_guests INT NOT NULL,
  bedrooms INT NOT NULL,
  bathrooms DECIMAL(3,1) NOT NULL,
  amenities JSON DEFAULT (JSON_ARRAY()),
  vibe_tags JSON DEFAULT (JSON_ARRAY()),
  house_rules TEXT DEFAULT NULL,
  clothing_optional TINYINT(1) NOT NULL DEFAULT 0,
  lgbtq_friendly TINYINT(1) NOT NULL DEFAULT 1,
  is_elite_only TINYINT(1) NOT NULL DEFAULT 0,
  images JSON DEFAULT (JSON_ARRAY()),
  min_stay_nights INT NOT NULL DEFAULT 2,
  check_in_time VARCHAR(10) NOT NULL DEFAULT '15:00',
  check_out_time VARCHAR(10) NOT NULL DEFAULT '11:00',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_is_elite (is_elite_only),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- ─── Stay Requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stay_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  partner_home_id INT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guest_count INT NOT NULL DEFAULT 1,
  message TEXT DEFAULT NULL,
  status ENUM('pending','approved','declined','cancelled') NOT NULL DEFAULT 'pending',
  admin_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_home_id) REFERENCES partner_homes(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_home_id (partner_home_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── Partner Perks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_perks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  discount_details TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  logo_url VARCHAR(500) DEFAULT NULL,
  website_url VARCHAR(500) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ─── Shop Products ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category ENUM('merchandise','pearls') NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  is_elite_only TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  stripe_price_id VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_elite (is_elite_only)
) ENGINE=InnoDB;

-- ─── Purchases ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('itinerary','subscription','shop') NOT NULL,
  item_id INT DEFAULT NULL,
  item_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  stripe_session_id VARCHAR(255) DEFAULT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── Beach Locations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beach_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  status ENUM('official_nude','clothing_optional','gay_beach','gay_resort','clothed_gay_beach') NOT NULL,
  description TEXT NOT NULL,
  bask_notes TEXT DEFAULT NULL,
  tags JSON DEFAULT (JSON_ARRAY()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user (password: Admin@BASK2026!)
INSERT IGNORE INTO users (email, password_hash, first_name, last_name, membership_tier, is_admin, has_selected_membership)
VALUES (
  'mykebmusic@gmail.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhsVV7FcGqpPT1qL0ZQNSO',
  'Admin',
  'BASK',
  'Elite',
  1,
  1
);

-- Curated Trips — Upcoming
INSERT IGNORE INTO curated_trips (id, title, destination, country, start_date, end_date, price_per_person, description, tags, is_past, max_guests) VALUES
(10, 'Paris Black Pride 2025', 'Paris', 'France', '2025-05-15', '2025-05-22', 4200.00,
 '7 nights celebrating Black excellence at Paris Black Pride. Seine River cruise, Louvre, jazz in Montmartre, and inclusive nightlife.',
 '["Pride","Cultural","City","LGBTQ+"]', 0, 20),
(11, 'Algarve Afro Nation', 'Portimão, Algarve', 'Portugal', '2025-06-28', '2025-07-05', 3800.00,
 '7 nights in the Algarve during Afro Nation Portugal. Cliffside scenery, Praia da Rocha, and the world''s premier Afrobeats festival.',
 '["Music Festival","Beach","Afrobeats","LGBTQ+"]', 0, 16),
(12, 'PVR Escape', 'Puerto Vallarta', 'Mexico', '2025-08-10', '2025-08-17', 2900.00,
 '7 nights in Mexico''s premier gay beach destination. Jets Naked Beach, Zona Romántica, Vallarta Pride events, and evening cruises.',
 '["Beach","Gay Destination","Nude-Friendly","Nightlife"]', 0, 18),
(13, 'Amsterdam World Pride 2026', 'Amsterdam', 'Netherlands', '2026-07-31', '2026-08-07', 5100.00,
 '8 nights at the world''s largest Pride celebration. Canal boat parade, Vondelpark picnics, Anne Frank House, and festival events.',
 '["World Pride","Cultural","LGBTQ+","Festival"]', 0, 24),
(14, 'Camp Nirvana – Fire Island', 'Fire Island, New York', 'USA', '2025-09-05', '2025-09-12', 3400.00,
 '7 nights on iconic Fire Island. Cherry Grove, The Pines, tea dances, nude beach days, community gatherings.',
 '["Beach","Gay Community","Clothing Optional","Iconic"]', 0, 14);

-- Curated Trips — Past
INSERT IGNORE INTO curated_trips (id, title, destination, country, start_date, end_date, price_per_person, description, tags, is_past, max_guests) VALUES
(7, 'Panama: Bocas del Toro', 'Bocas del Toro', 'Panama', '2024-02-01', '2024-02-10', 2800.00,
 'Caribbean island-hopping, snorkeling, Zapatilla Cays, jungle waterfall hikes, and hostel-bar nightlife.',
 '["Caribbean","Adventure","Nature","Beach"]', 1, 16),
(8, 'Italy: Amalfi & Positano', 'Amalfi Coast', 'Italy', '2024-06-01', '2024-06-10', 4500.00,
 'Cliffside villages, limoncello tastings, boat tours, and sunset dinners along one of the world''s most scenic coastlines.',
 '["Mediterranean","Luxury","Culture","Coastal"]', 1, 14),
(9, 'Egypt & the Nile', 'Cairo & Luxor', 'Egypt', '2024-10-01', '2024-10-12', 3200.00,
 'Pyramids of Giza, Nile River cruise, Valley of the Kings, Karnak Temple, and Cairo''s Khan el-Khalili bazaar.',
 '["Historical","Adventure","Cultural","Bucket List"]', 1, 18),
(15, 'Brazil NYE 2025–2026', 'Rio de Janeiro · Salvador · Morro de São Paulo', 'Brazil', '2025-12-28', '2026-01-09', 5800.00,
 'NYE on Copacabana, Praia do Abricó nude beach day trip, Salvador Carnaval preview, island-hopping in Morro de São Paulo.',
 '["NYE","Brazil","Beach","Nude-Friendly","Afro-Cultural"]', 1, 20),
(16, 'Birthday in Cape Town', 'Cape Town · Simon''s Town · Inverdoorn', 'South Africa', '2026-01-21', '2026-01-28', 4900.00,
 'Lion''s Head sunrise hike, helicopter ride, Sandy Bay nude beach, Robben Island, Big Five safari at Inverdoorn, Cape winelands.',
 '["Safari","Adventure","Beach","Wine Country","Nude-Friendly"]', 1, 16);

-- Partner Perks
INSERT IGNORE INTO partner_perks (partner_name, description, discount_details, category, website_url, is_active) VALUES
('Jets Naked Beach', 'Premier clothing-optional beach destination in Puerto Vallarta, Mexico', 'Exclusive access and priority reservations for BASK Elite members', 'Travel & Lifestyle', 'https://jetsnakedbeach.com', 1),
('Pure for Men', 'Premium supplement and wellness brand for the modern gay man', '20% discount on all products for BASK Elite members', 'Health & Wellness', 'https://pureformen.com', 1),
('VACAYA', 'The world''s leading LGBTQ+ travel experience company', 'Priority booking access and $100 onboard credit', 'Travel & Lifestyle', 'https://vacaya.com', 1),
('Scruff', 'The world''s most popular gay, bi, trans & queer social network', 'Complimentary Pro membership for BASK Elite members', 'Romance & Social', 'https://scruff.com', 1),
('Thinx', 'Innovative comfort and lifestyle apparel', '25% off your first order', 'Health & Wellness', 'https://thinx.com', 1),
('Away Luggage', 'Premium travel luggage designed for modern travelers', '15% discount on all Away products', 'Travel & Lifestyle', 'https://awaytravel.com', 1);

-- Shop Products — Merchandise
INSERT IGNORE INTO shop_products (name, description, price, category, is_elite_only, is_active) VALUES
('BASK Logo Tee', 'Premium cotton tee with embroidered BASK logo in terracotta on cream', 38.00, 'merchandise', 0, 1),
('BASK Travel Tank', 'Lightweight moisture-wicking travel tank in BASK signature colors', 32.00, 'merchandise', 0, 1),
('BASK Elite Cap', 'Structured cap with gold embroidery — Elite members only', 45.00, 'merchandise', 1, 1),
('BASK Beach Towel', 'Oversized Turkish cotton towel with BASK coastal print', 65.00, 'merchandise', 0, 1),
('BASK Sarong', 'Hand-printed sarong in terracotta and cream block pattern', 48.00, 'merchandise', 0, 1),
('BASK Candle', 'Hand-poured soy candle — Coconut Tiare & Sea Salt scent', 42.00, 'merchandise', 0, 1),
('BASK Travel Pouch', 'Waxed canvas travel pouch with leather pulls', 28.00, 'merchandise', 0, 1);

-- Shop Products — Freshwater Pearls (Elite Only)
INSERT IGNORE INTO shop_products (name, description, price, category, is_elite_only, is_active) VALUES
('Tahitian Black Pearls', 'Rare black pearls sourced from French Polynesia with deep iridescent luster', 285.00, 'pearls', 1, 1),
('Mediterranean Akoya Pearls', 'Classic Akoya pearls from the Mediterranean with brilliant white sheen', 195.00, 'pearls', 1, 1),
('South Sea Golden Pearls', 'Prized golden pearls from Australia and the Philippines — the rarest in the collection', 395.00, 'pearls', 1, 1),
('Caribbean Rose Pearls', 'Blush-toned freshwater pearls with soft Caribbean warmth', 175.00, 'pearls', 1, 1),
('Chinese Freshwater Pearls', 'Classic freshwater pearls with exceptional roundness and luster', 145.00, 'pearls', 1, 1);

-- Beach Locations
INSERT IGNORE INTO beach_locations (name, location, country, latitude, longitude, status, description, tags) VALUES
('Playa Zipolite', 'Oaxaca', 'Mexico', 15.6728, -96.4942, 'official_nude', 'Mexico''s only official nude beach. Bohemian village, powerful waves, and a legendary free-spirited community.', '["Nude","Official","Mexico","Bohemian"]'),
('Jets Naked Beach', 'Puerto Vallarta', 'Mexico', 20.6296, -105.2332, 'clothing_optional', 'The premier clothing-optional gay beach in Puerto Vallarta. BASK partner destination.', '["Nude-Friendly","Gay","Mexico","BASK Partner"]'),
('Haulover Beach', 'Miami, Florida', 'USA', 25.9010, -80.1215, 'official_nude', 'Miami''s official nude beach — one of the most popular in the US. Well-maintained and family-friendly section plus nude zone.', '["Nude","Official","Miami","USA"]'),
('Hippie Hollow', 'Austin, Texas', 'USA', 30.4022, -97.9211, 'clothing_optional', 'Texas''s only legal nude beach on Lake Travis. Rocky shores and beautiful hill country scenery.', '["Nude-Friendly","Lake","Texas","USA"]'),
('Ginger Rogers Beach', 'Malibu, California', 'USA', 34.0194, -118.7798, 'gay_beach', 'Malibu''s beloved gay social beach. Stunning Pacific views and inclusive community.', '["Gay","California","Pacific","USA"]'),
('Black''s Beach', 'San Diego, California', 'USA', 32.8834, -117.2531, 'clothing_optional', 'San Diego''s unofficial nude beach below Torrey Pines cliffs. Accessed via steep trail.', '["Nude-Friendly","San Diego","California","USA"]'),
('Praia do Abricó', 'Rio de Janeiro', 'Brazil', -22.9970, -43.3669, 'official_nude', 'Rio''s only official nude beach in the Recreio neighborhood. Calm waters and relaxed atmosphere.', '["Nude","Official","Rio","Brazil","BASK Trip"]'),
('Platja dels Balmins', 'Sitges', 'Spain', 41.2181, 1.8203, 'clothing_optional', 'Clothing-optional cove in Sitges, one of Europe''s most beloved gay destinations.', '["Nude-Friendly","Gay Friendly","Sitges","Spain"]'),
('Praia 19', 'Costa da Caparica', 'Portugal', 38.5001, -9.2290, 'official_nude', 'Official nudist section of Costa da Caparica''s legendary Atlantic beach strip.', '["Nude","Official","Portugal","Atlantic"]'),
('Praia do Homem Nu', 'Tavira Island, Algarve', 'Portugal', 37.1012, -7.6501, 'official_nude', 'Remote nudist beach on Tavira Island, reachable only by boat. Pristine Algarve beauty.', '["Nude","Official","Algarve","Portugal","Remote"]'),
('Mar Bella Beach', 'Barcelona', 'Spain', 41.4031, 2.2140, 'clothing_optional', 'Barcelona''s gay and clothing-optional beach in the Poblenou district. Vibrant and social.', '["Nude-Friendly","Gay","Barcelona","Spain"]'),
('Sandy Bay Beach', 'Cape Town', 'South Africa', -34.0981, 18.3517, 'clothing_optional', 'Cape Town''s unofficial nudist beach near Llandudno. Secluded and spectacular mountain backdrop.', '["Nude-Friendly","Cape Town","South Africa","BASK Trip"]'),
('Little Beach', 'Maui, Hawaii', 'USA', 20.6294, -156.4474, 'clothing_optional', 'Hawaii''s beloved unofficial nude beach in Makena State Park. Sunday drum circles are legendary.', '["Nude-Friendly","Hawaii","Pacific","USA"]'),
('Cherry Grove Beach', 'Fire Island, New York', 'USA', 40.6479, -73.1065, 'clothing_optional', 'Iconic gay community beach at Cherry Grove. At the heart of Fire Island''s legendary LGBTQ+ culture.', '["Clothing Optional","Gay","Fire Island","BASK Trip"]'),
('Race Point / Herring Cove', 'Provincetown, MA', 'USA', 42.0759, -70.2040, 'clothing_optional', 'P-town''s clothing-optional gay beach. Stunning Cape Cod dunes and legendary community.', '["Clothing Optional","Gay","Provincetown","USA"]'),
('Arembepe (Coqueirinho Area)', 'Salvador, Bahia', 'Brazil', -12.6484, -38.1772, 'clothing_optional', 'Hippie village north of Salvador with a clothing-optional beach scene. Connected to BASK Brazil trip.', '["Clothing Optional","Salvador","Brazil","BASK Trip"]'),
('Condado Beach (Tryst Area)', 'San Juan', 'Puerto Rico', 18.4594, -66.0820, 'clothed_gay_beach', 'San Juan''s gay social beach scene in the Condado district. Vibrant and welcoming.', '["Gay","Puerto Rico","Caribbean","Clothed"]'),
('Oasis Beach (Wreck Beach)', 'Vancouver, BC', 'Canada', 49.2644, -123.2570, 'clothing_optional', 'Canada''s largest clothing-optional beach below UBC cliffs. Over 2km of naturist shoreline.', '["Nude-Friendly","Vancouver","Canada","Pacific"]'),
('Maspalomas Beach (Dunes)', 'Gran Canaria', 'Spain', 27.7402, -15.5889, 'clothing_optional', 'Europe''s premier gay beach resort. Massive sand dunes, nude sunbathing, and legendary nightlife.', '["Clothing Optional","Gay","Gran Canaria","Spain","Europe"]'),
('Hollywood Beach', 'Chicago, Illinois', 'USA', 41.9934, -87.6552, 'gay_beach', 'Chicago''s beloved gay social beach on Lake Michigan. Lively summer scene.', '["Gay","Chicago","Lake Michigan","USA"]'),
('Dune Resort', 'Douglas (Saugatuck), Michigan', 'USA', 42.6439, -86.2029, 'gay_resort', 'Michigan''s premier gay resort on the shores of Lake Michigan. LGBTQ+ exclusive property.', '["Gay Resort","Michigan","LGBT+","USA"]'),
('Coqui Del Mar Guest House', 'Guánica', 'Puerto Rico', 17.9706, -66.9097, 'gay_resort', 'Intimate gay guest house on Puerto Rico''s southwest coast. Secluded and adult-oriented.', '["Gay Resort","Puerto Rico","Caribbean","Intimate"]'),
('Casa Risa', 'Portimão, Algarve', 'Portugal', 37.1359, -8.5370, 'gay_resort', 'Gay-friendly resort in the heart of the Algarve. BASK Algarve Afro Nation trip base.', '["Gay Resort","Algarve","Portugal","BASK Trip"]'),
('Fire Island Pines', 'Fire Island, New York', 'USA', 40.6540, -73.0950, 'gay_resort', 'The iconic gay mecca of the East Coast. World-famous tea dances, The Meat Rack, and endless community.', '["Gay Resort","Fire Island","New York","Iconic"]');
