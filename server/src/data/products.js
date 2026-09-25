import imagePool from "./imagePool.js"

// Deterministic pseudo-random generator so a seeded catalog is reproducible.
function makeRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120)

// Product name templates per category. {brand} is substituted at generation time,
// so every category gets a believable, specific catalog rather than repeated rows.
const catalog = {
  Electronics: {
    brands: ["Sony", "Samsung", "LG", "Panasonic", "Bose", "JBL", "Philips", "Sennheiser"],
    items: [
      ["Wireless Noise Cancelling Headphones", "Over-ear ANC with adaptive transparency and multipoint pairing."],
      ["Ultra HD Smart TV 55 inch", "4K HDR panel with Dolby Vision and built-in voice assistants."],
      ["Bluetooth Soundbar with Wireless Subwoofer", "3.1 channel audio with HDMI eARC and night mode."],
      ["Portable Bluetooth Speaker", "Waterproof speaker with 20-hour battery and stereo pairing."],
      ["Wireless Earbuds Pro", "Active noise cancelling earbuds with wireless charging case."],
      ["Smart LED Desk Lamp", "Adjustable colour temperature lamp with USB charging port."],
      ["Digital Voice Recorder", "High-fidelity handheld recorder with noise reduction."],
      ["Home Theater Sound System", "Surround speaker package with wireless subwoofer."],
      ["Turntable Vinyl Record Player", "Belt-drive turntable with built-in preamp and Bluetooth."],
      ["Noise Isolating Earbuds", "Sealed in-ear monitors with detachable cable option."],
      ["Smart Speaker with Display", "Voice assistant with a built-in touchscreen."],
      ["Amplified Soundbar Soundbar", "Room-filling sound with clear dialogue enhancement."],
      ["Wireless Over-Ear Headset", "Low-latency wireless headset for calls and music."],
      ["Compact Photo Speaker", "Pocket speaker with surprisingly full-range sound."],
      ["Hi-Fi Wireless Speaker", "Multi-room speaker with lossless streaming."],
      ["Studio Monitor Speaker", "Near-field monitor for accurate mixing at home."],
    ],
  },
  Phones: {
    brands: ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Motorola", "Nothing"],
    items: [
      ["Smartphone 5G 128GB", "6.7 inch AMOLED display, triple camera, all-day battery."],
      ["Smartphone Pro 256GB", "Premium camera system with optical zoom and titanium frame."],
      ["Smartphone Lite 64GB", "Compact 5G phone with long battery life."],
      ["Foldable Smartphone", "Flexible display that folds to a pocket-sized shape."],
      ["Rugged Smartphone", "Drop-rated, waterproof phone for outdoor work."],
      ["Smartphone Camera Edition", "Large sensor and fast autofocus for photo and video."],
      ["Budget Smartphone", "Everyday performance with a long-lasting battery."],
      ["Smartphone Max Battery", "High-capacity battery with fast charging."],
      ["5G Smartphone Dual SIM", "Dual SIM support with a bright 120Hz display."],
      ["Smartphone Case Clear", "Shockproof clear case with reinforced corners."],
      ["Tempered Glass Screen Protector", "9H hardness glass with an easy install frame."],
      ["Fast Charger 65W", "USB-C charger with power delivery for phones and tablets."],
      ["Wireless Charging Stand", "Qi-certified charging stand with a non-slip base."],
      ["Car Phone Mount", "Magnetic dashboard mount with a 360 degree rotation."],
    ],
  },
  Computers: {
    brands: ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "Microsoft"],
    items: [
      ["Ultrabook 14 inch 16GB", "Thin and light laptop with an all-day battery and backlit keyboard."],
      ["Gaming Laptop 16GB RTX", "Dedicated graphics, high refresh display, and advanced cooling."],
      ["Desktop Tower PC", "Expandable desktop with a quiet power supply and tool-less case."],
      ["All-in-One Desktop 24 inch", "Slim display with built-in camera, speakers, and microphone."],
      ["Mini PC Compact", "Palm-sized desktop for office work and media."],
      ["Portable Monitor 15 inch", "Travel monitor with USB-C connectivity."],
      ["Mechanical Keyboard", "Hot-swappable switches with a aluminium frame."],
      ["Wireless Mouse Ergonomic", "Vertical wireless mouse with long battery life."],
      ["27 inch 4K Monitor", "IPS display with USB-C power delivery and thin bezels."],
      ["Ultrawide 34 inch Monitor", "Curved display for multitasking and creative work."],
      ["USB-C Docking Station", "Single-cable dock with dual display and ethernet."],
      ["Laptop Stand Aluminium", "Adjustable ventilated stand for a better viewing angle."],
      ["Webcam Full HD 1080p", "Sharp video calls with a privacy shutter."],
      ["External SSD 1TB", "Fast portable solid-state drive with USB-C."],
      ["Wi-Fi 6E Router", "Tri-band router for faster whole-home coverage."],
    ],
  },
  Cameras: {
    brands: ["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "GoPro"],
    items: [
      ["Mirrorless Camera 24MP", "Interchangeable lens body with in-body stabilisation."],
      ["DSLR Camera with Kit Lens", "Optical viewfinder camera with an all-in-one zoom lens."],
      ["Compact Travel Camera", "Pocket-sized camera with a bright fixed zoom lens."],
      ["Action Camera Waterproof", "Waterproof action camera with stabilisation and voice control."],
      ["Instant Film Camera", "Point-and-shoot instant camera for prints in seconds."],
      ["Camera Tripod Aluminium", "Adjustable tripod with a ball head and carry case."],
      ["Camera Sling Bag", "Weather-resistant bag with padded camera compartments."],
      ["Camera Lens 35mm f/1.8", "Fast prime lens for street and portrait photography."],
      ["Camera Lens 70-200mm", "Telephoto zoom lens with image stabilisation."],
      ["Memory Card 128GB U3", "High-speed SD card for 4K video recording."],
      ["Portable Photo Printer", "Print photos from a phone with borderless output."],
      ["LED Video Light Panel", "Adjustable fill light for video and portraits."],
    ],
  },
  Home: {
    brands: ["IKEA", "Amazon Basics", "Philips", "Crestron", "Bissell", "Shark"],
    items: [
      ["Memory Foam Bed Queen", "Pressure-relieving mattress with a breathable cover."],
      ["Sectional Sofa 3 Piece", "Modular sofa with washable covers and firm cushions."],
      ["Adjustable Standing Desk", "Electric desk with programmable height presets."],
      ["Ergonomic Office Chair", "Mesh-back task chair with lumbar support."],
      ["Bookshelf 5 Tier", "Sturdy storage shelf for books, plants, and storage bins."],
      ["Table Lamp Linen Shade", "Warm bedside lamp with a fabric shade and dimmer."],
      ["Area Rug 5x7", "Soft low-pile rug with a stain-resistant finish."],
      ["Throw Pillow Covers Set", "Four washable covers in a coordinated palette."],
      ["Floor Plant Pot 12 inch", "Self-watering planter for indoor plants."],
      ["Wall Mirror 24x36", "Framed full-length mirror with a metal edge."],
      ["Storage Ottoman 20 inch", "Lift-top storage bench with a padded cushion."],
      ["Air Purifier HEPA", "True HEPA filtration with a quiet night mode."],
      ["Weighted Blanket 15 lb", "Breathable cotton weighted blanket for restful sleep."],
      ["Ceiling Fan with Light", "Reversible motor fan with a dimmable LED light."],
      ["Vacuum Cleaner Cordless", "Stick vacuum with a wall-mounted charging dock."],
    ],
  },
  Kitchen: {
    brands: ["Instant Pot", "Cuisinart", "Ninja", "KitchenAid", "Husqvarna", "Wüsthof"],
    items: [
      ["Multi-Cooker Pressure Cooker 6 Qt", "Pressure cook, slow cook, saute, and steam in one pot."],
      ["Stand Mixer 5 Qt", "Tilt-head stand mixer with a stainless steel bowl."],
      ["Air Fryer 5.8 Qt", "Digital air fryer with preset cooking programs."],
      ["Chef Knife 8 inch", "German-style chef knife with a full tang handle."],
      ["Cast Iron Skillet 12 inch", "Pre-seasoned skillet that lasts for generations."],
      ["Nonstick Cookware Set", "Pans and pots with ceramic nonstick coating."],
      ["Electric Kettle 1.7L", "Fast-boil kettle with temperature control."],
      ["Coffee Maker 12 Cup", "Programmable drip coffee maker with a thermal carafe."],
      ["Espresso Machine Semi-Automatic", "Barista-style machine with a steam wand."],
      ["Blender 1200W", "High-power blender for smoothies, soups, and ice."],
      ["Toaster 4 Slice", "Extra-wide slot toaster with bagel mode."],
      ["Cutting Board Bamboo", "Reversible bamboo board with juice grooves."],
      ["Mixing Bowls Set", "Stainless steel bowls that nest for storage."],
      ["Dish Drying Rack", "Stainless steel rack with a drain board and utensil holder."],
      ["Food Storage Containers Set", "Airtight containers that stack in the fridge."],
    ],
  },
  Fashion: {
    brands: ["Nike", "Adidas", "Levi's", "Zara", "H&M", "Uniqlo", "Carhartt"],
    items: [
      ["Running Shoes Men", "Responsive cushioning with a breathable engineered mesh upper."],
      ["Training Shoes Women", "Supportive trainers with a flexible rubber outsole."],
      ["Classic Denim Jeans", "Mid-rise straight-leg jeans in rigid cotton denim."],
      ["Performance Hoodie", "Moisture-wicking hoodie with a brushed inner layer."],
      ["Leather Sneakers", "Clean low-top leather sneakers with a cushioned insole."],
      ["Packable Rain Jacket", "Lightweight waterproof shell that folds into a pocket."],
      ["Merino Wool Sweater", "Fine-gauge wool sweater for cool weather layering."],
      ["Canvas Backpack 25L", "Water-resistant backpack with a padded laptop sleeve."],
      ["Polarised Sunglasses", "UV400 lenses with a lightweight metal frame."],
      "Wool Blend Beanie",
      "Cotton Crew Socks 6 Pack",
      "Leather Belt Classic",
      "Crossbody Bag Small",
      "Fleece Zip Hoodie",
      "Chino Trousers Slim",
    ].map((item) => (Array.isArray(item) ? item : [item, "Classic everyday cut with durable fabric and a comfortable finish."])),
  },
  Beauty: {
    brands: ["L'Oréal", "Neutrogena", "The Ordinary", "CeraVe", "Olay", "Nivea"],
    items: [
      ["Vitamin C Brightening Serum", "Daily serum that helps even out skin tone."],
      ["Hyaluronic Acid Moisturiser", "Lightweight hydrating cream for all skin types."],
      ["Gentle Foaming Cleanser", "Soap-free cleanser that does not strip moisture."],
      ["Broad Spectrum Sunscreen SPF 50", "Daily mineral sunscreen with no white cast."],
      ["Retinol Night Cream", "Night cream that smooths the look of fine lines."],
      ["Niacamide Oil Free Moisturiser", "Balanced moisturiser for combination skin."],
      ["Deep Repair Hair Mask", "Weekly mask that softens dry, damaged hair."],
      ["Volumising Shampoo 400ml", "Cleansing shampoo that adds body and shine."],
      ["Argan Hair Oil 100ml", "Lightweight finishing oil for shine and frizz control."],
      ["Lip Balm SPF 15 Trio", "Three tinted balms for everyday colour."],
      ["Matte Liquid Lipstick", "Long-wearing liquid colour with a soft matte finish."],
      ["Waterproof Eyeliner", "Quick-drying liner that resists smudging."],
      ["Makeup Brush Set", "Ten brushes in a roll-up travel case."],
      ["Cuticle Nail Care Kit", "Nail file, buffer, and cuticle care essentials."],
      ["Natural Soap Bar Pack", "Gentle cleansing bars in a recyclable pack."],
    ],
  },
  Books: {
    brands: ["Penguin", "HarperCollins", "O'Reilly", "Pearson", "MIT Press", "Simon & Schuster"],
    items: [
      ["The Pragmatic Programmer", "A practical guide to software craft and career longevity."],
      ["Clean Code", "Principles and patterns for writing readable, maintainable code."],
      ["Designing Data-Intensive Applications", "A tour of the architecture behind reliable data systems."],
      ["Introduction to Algorithms", "Foundational algorithm design and analysis textbook."],
      ["Refactoring", "Techniques for improving the design of existing code."],
      ["The Pragmatic Programmer 20th Anniversary", "Updated edition with new chapters and exercises."],
      ["Deep Work", "Rules for focused success in a distracted world."],
      ["Atomic Habits", "A practical framework for building good habits."],
      ["Structure and Interpretation of Computer Programs", "Classic programming text on abstraction."],
      ["Site Reliability Engineering", "Practical guidance on running reliable production systems."],
      ["The Mythical Man-Month", "Essays on software project management."],
      ["Computer Science Illuminated", "A broad introduction to computing topics."],
      ["Fiction Hardcover Bestseller", "A page-turning novel from a bestselling author."],
      ["Biography Hardcover", "An illustrated biography of a widely admired figure."],
    ],
  },
  Toys: {
    brands: ["LEGO", "Hasbro", "Mattel", "Melissa & Doug", "Bandai", "Funko"],
    items: [
      ["Building Blocks 500 Piece Set", "Classic brick set with wheels, windows, and figures."],
      ["Wooden Train Track Set", "Interlocking wooden track with a magnetic train."],
      ["Remote Control Rally Car", "All-terrain RC car with 2.4GHz control."],
      ["Puzzle 1000 Piece", "Detailed jigsaw puzzle with 1000 pieces."],
      ["Magnetic Tiles 42 Piece", "Safe magnetic tiles for building 3D structures."],
      ["Art Studio 200 Piece", "Complete art set with paints, brushes, and paper."],
      ["Dollhouse Furniture Set", "Miniature furniture for dollhouse play."],
      ["Science Experiment Kit", "Safe at-home chemistry set with a guide."],
      ["Board Game Strategy", "A strategic board game for two to four players."],
      ["Plush Animal XL", "Soft oversized plush toy for cuddling."],
      ["Ride-On Balance Bike", "First balance bike with an adjustable seat."],
      ["Space Explorer Model Kit", "Build a detailed model rocket or space station."],
      ["Dollhouse 3 Storey", "Wooden dollhouse with furniture and figures."],
      ["Rc Stunt Drone", "Aerial drone with flips, lights, and one-touch controls."],
      ["Play Tent for Kids", "Collapsible indoor tent with a rain window."],
    ],
  },
  Grocery: {
    brands: ["Whole Foods", "Tate's", "Keurig", "Kettle Brand", "Nature Valley", "Kind"],
    items: [
      ["Arabica Coffee Beans 1kg", "Medium roast whole bean coffee with chocolate notes."],
      ["Ground Coffee House Blend", "Smooth pre-ground blend for drip brewers."],
      ["Classic Potato Chips", "Lightly salted kettle-cooked potato chips."],
      ["Trail Mix Nut Blend", "Roasted nuts, dried fruit, and chocolate."],
      ["Dark Chocolate 70% Bar", "Single-origin dark chocolate with a smooth finish."],
      ["Extra Virgin Olive Oil 750ml", "Cold-pressed olive oil with a fruity aroma."],
      ["Organic Green Tea 50 Bags", "Antioxidant-rich green tea bags."],
      ["Raw Honey 340g", "Unfiltered honey from local apiaries."],
      ["Sea Salt Grinder", "Sea salt in a grinder for finishing dishes."],
      ["Pasta Penne 500g", "Bronze-cut penne that holds sauce."],
      ["Quinoa Ancient Grain 1kg", "Whole grain quinoa for salads and bowls."],
      ["Almond Butter 350g", "Roasted almond butter with no added sugar."],
      ["Breakfast Granola 500g", "Crunchy granola with oats, nuts, and honey."],
      ["Sparkling Water 12 Pack", "Lightly sparkling mineral water."],
      ["Chai Tea Concentrate", "Spiced black tea concentrate for lattes."],
    ],
  },
  Sports: {
    brands: ["Nike", "Adidas", "Coleman", "Wilson", "Callaway", "Hydro Flask"],
    items: [
      ["Yoga Mat 6mm", "Non-slip exercise mat with alignment lines."],
      ["Adjustable Dumbbell Set", "Dial dumbbells that adjust from 5 to 25 kg."],
      ["Resistance Bands Set", "Five resistance levels for strength training."],
      ["Insulated Water Bottle 750ml", "Double-walled bottle that keeps drinks cold for 24 hours."],
      ["Running Belt Pro", "Waist running belt with a bounce-free phone pocket."],
      ["Camping Tent 2 Person", "Lightweight backpacking tent with a rainfly."],
      ["Sleeping Bag 15C", "Warm mummy bag rated for cold conditions."],
      ["Hiking Daypack 30L", "Ventilated daypack with a hydration sleeve."],
      ["Trekking Poles Carbon", "Collapsible carbon poles with cork grips."],
      ["Cycling Helmet", "Lightweight helmet with vents and an adjustable fit."],
      ["Football Size 5", "Match-grade football with a textured surface."],
      ["Basketball Indoor Outdoor", "Durable composite basketball for all surfaces."],
      ["Golf Ball Set", "Tour-grade golf balls with a high launch spin."],
      ["Skipping Rope Speed", "Ball-bearing skip rope for conditioning."],
      ["Foam Roller Textured", "Deep tissue roller for post-workout recovery."],
    ],
  },
  Gaming: {
    brands: ["Sony", "Microsoft", "Nintendo", "Logitech", "Razer", "SteelSeries", "HyperX"],
    items: [
      ["Wireless Controller", "Low-latency wireless controller with haptics and motion sensors."],
      ["Wireless Gaming Headset", "Low-latency headset with a detachable boom mic."],
      ["Mechanical Gaming Keyboard", "Hot-swappable mechanical keyboard with per-key lighting."],
      ["Gaming Mouse 26000 DPI", "Lightweight wireless gaming mouse with an optical sensor."],
      ["Gaming Mousepad XL", "Stitched-edge mousepad with a hard, even surface."],
      ["Portable Gaming Monitor 15 inch", "High refresh portable monitor for play anywhere."],
      ["Gaming Chair Ergonomic", "High-back gaming chair with lumbar support and armrests."],
      ["Console Gaming Stand", "Vertical stand with cable management for a console."],
      ["Game Capture Card", "Plug-and-play capture card for streaming and recording."],
      ["RGB Mousepad XL", "Soft pad with configurable lighting zones."],
      ["Joy-Con Style Controllers", "Detachable controllers for a more comfortable grip."],
      ["Gaming Microphone USB", "Cardioid USB microphone with a built-in shock mount."],
      ["Headset Stand RGB", "Weighted headset stand with an RGB base."],
      ["Console Charging Dock", "Charging dock that charges controllers and a console."],
    ],
  },
}

const adjectives = ["Pro", "Max", "Plus", "Prime", "Elite", "Lite", "Ultra", "Essential", "Classic", "Advanced"]
const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`

// Builds the full demo catalog: at least 10 products per category.
export function buildCatalog() {
  const products = []
  let counter = 0
  for (const [category, config] of Object.entries(catalog)) {
    const pool = imagePool[category]
    const random = makeRandom(category.length * 7919 + 104729)
    config.items.forEach(([name, description], index) => {
      counter += 1
      const brand = config.brands[index % config.brands.length]
      const adjective = adjectives[(index * 3 + 1) % adjectives.length]
      const title = `${brand} ${name}`
      const basePrice = Number((18 + random() * 720).toFixed(2))
      const discounted = index % 4 === 0
      const price = discounted ? Number((basePrice * 0.82).toFixed(2)) : basePrice
      const originalPrice = discounted ? basePrice : price
      const images = [0, 1, 2].map((offset) => pool[(index + offset) % pool.length])
      const rating = Number((3.9 + random() * 1.1).toFixed(1))
      products.push({
        _id: `prod-${String(counter).padStart(3, "0")}`,
        sku: `${slugify(brand).slice(0, 3).toUpperCase()}-${slugify(category).slice(0, 4).toUpperCase()}-${String(counter).padStart(3, "0")}`,
        slug: slugify(`${title}-${adjective}`),
        title: index % 5 === 0 ? `${title} ${adjective}` : title,
        description: `${description} Made for everyday ${category.toLowerCase()} use with reliable materials and a ${random() > 0.5 ? "two-year" : "one-year"} manufacturer warranty.`,
        price,
        originalPrice,
        discount: Math.max(0, Math.round((1 - price / originalPrice) * 100)),
        images: images.map(photo),
        category,
        brand,
        rating,
        reviewCount: Math.floor(120 + random() * 9800),
        stock: 6 + Math.floor(random() * 60),
        bestseller: index % 6 === 0,
        featured: index % 5 === 0,
        deal: discounted,
        badge: index % 6 === 0 ? "Best Seller" : index % 5 === 0 ? "Amazon's Choice" : "",
        prime: true,
        delivery: "FREE delivery Tue, Sep 29",
        specifications: {
          Brand: brand,
          Category: category,
          Model: `${adjective} ${String(counter).padStart(4, "0")}`,
          Shipping: "Ships from Amazon Clone",
          Returns: "30-day returns",
        },
        features: [
          `Trusted ${brand} build quality`,
          `${index % 2 === 0 ? "Includes" : "Compatible with"} a ${random() > 0.5 ? "one-year" : "two-year"} warranty`,
          "Packed and shipped by Amazon Clone",
          index % 3 === 0 ? "Eligible for free delivery" : "Easy 30-day returns",
        ],
      })
    })
  }
  return products
}

export const demoProducts = buildCatalog()
export default demoProducts
