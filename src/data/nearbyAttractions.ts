export interface NearbyAttractionItem {
  id: string;
  title: string;
  nativeTitle?: string;
  category: 'temple' | 'palace' | 'fort' | 'museum' | 'nature' | 'monument' | 'spiritual' | 'culinary';
  categoryLabel: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  visitDurationMinutes: number;
  // Crucial requirement: short 1-line importance why this site should be visited
  oneLineImportance: string;
  highlightDetails: string[];
  bestTimeToVisit: string;
  entryFee: string;
}

export const NEARBY_ATTRACTIONS_DATABASE: NearbyAttractionItem[] = [
  // Nagpur & Vidarbha Heritage
  {
    id: 'tekdi-ganesh-mandir',
    title: 'Shree Ganesh Mandir Tekdi',
    nativeTitle: 'श्री गणेश मंदिर टेकडी',
    category: 'spiritual',
    categoryLabel: 'Ancient Hill Shrine',
    city: 'Nagpur',
    country: 'India',
    latitude: 21.1492,
    longitude: 79.0911,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Shri_Ganesh_Tekdi.jpg/1200px-Shri_Ganesh_Tekdi.jpg',
    rating: 4.9,
    reviewCount: 28000,
    visitDurationMinutes: 45,
    oneLineImportance: '250-year-old self-manifested (Swayambhu) Ganesha deity perched on a natural hillock, the spiritual guardian of Nagpur.',
    highlightDetails: [
      'Natural self-manifested rock Ganesha facing west under ancient sacred Peepal trees.',
      'Perched on Sitabuldi hill ridge overlooking Nagpur Railway Junction.',
      'Atmospheric morning Kakad Aarti and evening Mahapuja rituals.'
    ],
    bestTimeToVisit: 'Early morning (6:00 AM - 8:30 AM) or Tuesday evenings',
    entryFee: 'Free entry'
  },
  {
    id: 'sitabuldi-fort',
    title: 'Sitabuldi Fort & War Memorial',
    nativeTitle: 'सीताबर्डी किल्ला',
    category: 'fort',
    categoryLabel: 'Historical Battlefield Fort',
    city: 'Nagpur',
    country: 'India',
    latitude: 21.1472,
    longitude: 79.0838,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Sitabuldi_fort_gate.JPG/1200px-Sitabuldi_fort_gate.JPG',
    rating: 4.5,
    reviewCount: 9500,
    visitDurationMinutes: 75,
    oneLineImportance: 'Hilltop citadel that witnessed the historic 1817 Battle of Sitabuldi, offering panoramic 360-degree skyline views across Nagpur.',
    highlightDetails: [
      'Historic 1817 Battle of Sitabuldi war memorial obelisk and cannon bastions.',
      'Commanding twin hillocks fortified during the Bhosale Dynasty and British Raj.',
      'Panoramic 360-degree bird’s-eye viewpoint of the orange city.'
    ],
    bestTimeToVisit: 'Public national holidays (Republic Day, Maharashtra Day, Independence Day) or guided tours',
    entryFee: 'Free entry (Army ID / pass required on general days)'
  },
  {
    id: 'deekshabhoomi-stupa',
    title: 'Deekshabhoomi Sacred Stupa',
    nativeTitle: 'दीक्षाभूमी',
    category: 'spiritual',
    categoryLabel: 'Monumental Buddhist Stupa',
    city: 'Nagpur',
    country: 'India',
    latitude: 21.1278,
    longitude: 79.0669,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Deekshabhoomi.jpg/1200px-Deekshabhoomi.jpg',
    rating: 4.8,
    reviewCount: 34000,
    visitDurationMinutes: 90,
    oneLineImportance: 'The largest hollow Buddhist stupa in Asia where Dr. B. R. Ambedkar embraced Buddhism with 600,000 followers on Ashoka Vijaya Dashami 1956.',
    highlightDetails: [
      '120-foot-tall grand architectural dome modeled on the ancient Dhauli Buddhist stupa.',
      'Vast pristine marble meditation hall accommodating over 5,000 visitors.',
      'Global pilgrimage center during annual Dhammachakra Pravartan Din.'
    ],
    bestTimeToVisit: 'Morning 7:00 AM - 10:00 AM or peaceful sunset hours',
    entryFee: 'Free entry'
  },
  {
    id: 'futala-lake',
    title: 'Futala Lake & Illuminated Promenade',
    nativeTitle: 'फुटाळा तलाव',
    category: 'nature',
    categoryLabel: 'Lakeside Heritage Promenade',
    city: 'Nagpur',
    country: 'India',
    latitude: 21.1558,
    longitude: 79.0435,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Futala_Lake.JPG/1200px-Futala_Lake.JPG',
    rating: 4.6,
    reviewCount: 22000,
    visitDurationMinutes: 60,
    oneLineImportance: 'Historic 200-year-old Bhosale-era reservoir celebrated for evening sunset strolls, dancing fountains, and vibrant street food.',
    highlightDetails: [
      'Vibrant lakeside promenade famous for Nagpur special kulhad chai and street delicacies.',
      'Multi-colored illuminated dancing fountain with musical choreography.',
      'Breathtaking orange sunset reflections across the water.'
    ],
    bestTimeToVisit: 'Evening sunset (5:30 PM - 9:00 PM)',
    entryFee: 'Free promenade entry'
  },
  {
    id: 'zero-mile-stone',
    title: 'Zero Mile Stone & Center of India',
    nativeTitle: 'झिरो माईल स्टोन',
    category: 'monument',
    categoryLabel: 'Geographical Center Monument',
    city: 'Nagpur',
    country: 'India',
    latitude: 21.1498,
    longitude: 79.0806,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Zero_Mile_Stone_Nagpur.JPG/1200px-Zero_Mile_Stone_Nagpur.JPG',
    rating: 4.4,
    reviewCount: 6800,
    visitDurationMinutes: 30,
    oneLineImportance: 'Historic 1907 Great Trigonometrical Survey stone obelisk with 4 stucco horses marking the precise geographical center of undivided India.',
    highlightDetails: [
      'Carved sandstone pillar marking exact distances to all major cities in undivided India.',
      'Four sculpted stone horses erected by the British survey department.',
      'Flanked by the historic heritage avenue of Civil Lines.'
    ],
    bestTimeToVisit: 'Morning or late afternoon',
    entryFee: 'Free entry'
  },
  {
    id: 'dragon-palace-temple',
    title: 'Dragon Palace Buddhist Temple (Kamptee)',
    nativeTitle: 'ड्रॅगन पॅलेस मंदिर',
    category: 'spiritual',
    categoryLabel: 'Indo-Japanese Buddhist Temple',
    city: 'Nagpur',
    country: 'India',
    latitude: 21.2185,
    longitude: 79.1915,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Dragon_Palace_Temple_Nagpur.jpg/1200px-Dragon_Palace_Temple_Nagpur.jpg',
    rating: 4.7,
    reviewCount: 15400,
    visitDurationMinutes: 75,
    oneLineImportance: 'The "Lotus Temple of Nagpur" built with Indo-Japanese collaboration, enshrining a sacred sandalwood Buddha.',
    highlightDetails: [
      'Gleaming white lotus architecture set within 10 acres of Japanese landscaped gardens.',
      'Sacred single-block carved sandalwood Buddha image consecrated by Japanese Nichiren monks.',
      'Tranquil meditation halls with natural acoustic resonance.'
    ],
    bestTimeToVisit: '8:00 AM - 12:00 PM or 4:00 PM - 7:00 PM',
    entryFee: 'Free entry'
  },
  {
    id: 'ambazari-lake',
    title: 'Ambazari Lake & Biodiversity Park',
    nativeTitle: 'अंबाजी तलाव',
    category: 'nature',
    categoryLabel: 'Freshwater Lake & Nature Park',
    city: 'Nagpur',
    country: 'India',
    latitude: 21.1275,
    longitude: 79.0345,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Ambazari_Lake_Nagpur.jpg/1200px-Ambazari_Lake_Nagpur.jpg',
    rating: 4.5,
    reviewCount: 16000,
    visitDurationMinutes: 90,
    oneLineImportance: 'Nagpur’s largest freshwater reservoir giving birth to the Nag River, flanked by a 75-acre musical garden and nature trails.',
    highlightDetails: [
      'Origin spring of the historic Nag River which gave Nagpur its name.',
      'Extensive walking and jogging trails through tropical tree groves.',
      'Boating and evening musical fountain shows.'
    ],
    bestTimeToVisit: '6:00 AM - 9:00 AM or 4:30 PM - 7:00 PM',
    entryFee: '₹10 for garden entry'
  },

  // Madurai & Tamil Nadu
  {
    id: 'meenakshi-temple',
    title: 'Meenakshi Amman Temple',
    nativeTitle: 'மீனாட்சி அம்மன் கோவில்',
    category: 'temple',
    categoryLabel: 'Dravidian Temple',
    city: 'Madurai',
    country: 'India',
    latitude: 9.9195,
    longitude: 78.1193,
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 38200,
    visitDurationMinutes: 120,
    oneLineImportance: 'Famous worldwide for 14 monumental gopurams encrusted with 33,000 colorful divine sculptures and the majestic Hall of 1,000 Pillars.',
    highlightDetails: [
      'Golden Lotus Pond (Porthamarai Kulam) where ancient Tamil poets tested their verses.',
      'Aayiram Kaal Mandapam featuring 985 exquisitely sculpted monolithic stone pillars.',
      'Nightly sacred chariot procession ceremony of Lord Sundareswarar.'
    ],
    bestTimeToVisit: 'Early morning (5:30 AM - 8:00 AM) or evening sunset',
    entryFee: 'Free (Special Darshan ₹50 - ₹100)'
  },
  {
    id: 'thirumalai-nayakar-mahal',
    title: 'Thirumalai Nayakkar Mahal',
    nativeTitle: 'திருமலை நாயக்கர் மஹால்',
    category: 'palace',
    categoryLabel: 'Royal Palace',
    city: 'Madurai',
    country: 'India',
    latitude: 9.9154,
    longitude: 78.1238,
    imageUrl: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
    rating: 4.6,
    reviewCount: 14500,
    visitDurationMinutes: 60,
    oneLineImportance: 'Grand 17th-century palace celebrated for its massive 82-foot-tall stucco columns and vibrant evening sound-and-light history show.',
    highlightDetails: [
      'Stunning fusion of Italian Renaissance and Dravidian architectural arches.',
      'Swarga Vilasam (Celestial Pavilion) supported by 248 giant ornate pillars.',
      'Daily multi-lingual sound and light spectacle depicting King Nayakkar’s rule.'
    ],
    bestTimeToVisit: 'Late afternoon (3:30 PM - 6:30 PM)',
    entryFee: '₹10 for Indians, ₹50 for Foreigners'
  },
  {
    id: 'alagar-kovil',
    title: 'Alagar Koyil Temple & Hills',
    nativeTitle: 'அழகர் கோவில்',
    category: 'temple',
    categoryLabel: 'Hilltop Temple',
    city: 'Madurai',
    country: 'India',
    latitude: 10.0747,
    longitude: 78.2144,
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 9200,
    visitDurationMinutes: 90,
    oneLineImportance: 'Sacred hillside Vishnu shrine nestled in lush forests, famous for natural healing springs and the legendary Chithirai golden horse festival.',
    highlightDetails: [
      'Silambar river holy spring (Noopura Gangai) believed to possess herbal medicinal properties.',
      'Intricately carved stone sculptures depicting epic avatars of Lord Vishnu.',
      'Breathtaking panoramic mountain viewpoints of the Alagar hill reserve.'
    ],
    bestTimeToVisit: 'Morning hours (7:00 AM - 11:00 AM)',
    entryFee: 'Free entry'
  },
  {
    id: 'gandhi-memorial-museum',
    title: 'Gandhi Memorial Museum',
    nativeTitle: 'காந்தி நினைவு அருங்காட்சியகம்',
    category: 'museum',
    categoryLabel: 'Historical Museum',
    city: 'Madurai',
    country: 'India',
    latitude: 9.9304,
    longitude: 78.1408,
    imageUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80',
    rating: 4.5,
    reviewCount: 7800,
    visitDurationMinutes: 60,
    oneLineImportance: 'Houses the actual blood-stained garment Mahatma Gandhi wore on his assassination day, housed in a historic 17th-century Nayak palace.',
    highlightDetails: [
      'Special gallery on India’s freedom struggle containing rare historic photos.',
      'Visual timeline of Gandhi adopting his simple loincloth attire right in Madurai.',
      'Peaceful surrounding gardens with open-air amphitheater.'
    ],
    bestTimeToVisit: '10:00 AM - 1:00 PM or 2:00 PM - 5:30 PM',
    entryFee: 'Free entry'
  },

  // Agra & Delhi Heritage Belt
  {
    id: 'taj-mahal',
    title: 'Taj Mahal',
    nativeTitle: 'ताज महल',
    category: 'monument',
    categoryLabel: 'World Wonder & Mausoleum',
    city: 'Agra',
    country: 'India',
    latitude: 27.1751,
    longitude: 78.0421,
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 95000,
    visitDurationMinutes: 150,
    oneLineImportance: 'Peerless UNESCO World Wonder of translucent white Makrana marble built as an eternal testament of love by Emperor Shah Jahan.',
    highlightDetails: [
      'Pietra Dura semi-precious stone inlays with lapis lazuli and malachite.',
      'Perfect architectural symmetry framed by four anti-seismic minarets.',
      'Magical color shifts from pastel pink at sunrise to glowing gold under the moon.'
    ],
    bestTimeToVisit: 'Sunrise (6:00 AM) for golden morning light and minimal crowds',
    entryFee: '₹50 for Indians, ₹1100 for Foreigners'
  },
  {
    id: 'agra-fort',
    title: 'Agra Fort',
    nativeTitle: 'आगरा का किला',
    category: 'fort',
    categoryLabel: 'Mughal Imperial Fortress',
    city: 'Agra',
    country: 'India',
    latitude: 27.1795,
    longitude: 78.0211,
    imageUrl: 'https://images.unsplash.com/photo-1588083949474-77b7093320d6?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 42000,
    visitDurationMinutes: 120,
    oneLineImportance: 'Imposing red sandstone citadel from which 4 generations of Mughal emperors governed India and where Shah Jahan spent his final captive days.',
    highlightDetails: [
      'Musamman Burj marble octagonal tower with direct views of the Taj Mahal.',
      'Sheesh Mahal (Glass Palace) with thousands of Syrian reflective mirror pieces.',
      'Massive 70-foot-tall double fortification ramparts.'
    ],
    bestTimeToVisit: 'Morning or late afternoon (3:00 PM - 5:30 PM)',
    entryFee: '₹50 for Indians, ₹650 for Foreigners'
  },
  {
    id: 'fatehpur-sikri',
    title: 'Fatehpur Sikri & Buland Darwaza',
    nativeTitle: 'फतेहपुर सीकरी',
    category: 'palace',
    categoryLabel: 'Ancient Royal Capital',
    city: 'Agra',
    country: 'India',
    latitude: 27.0945,
    longitude: 77.6679,
    imageUrl: 'https://images.unsplash.com/photo-1592635196078-9ffc829e0018?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 22000,
    visitDurationMinutes: 150,
    oneLineImportance: 'The world’s highest gateway (Buland Darwaza at 54m) guarding Emperor Akbar’s miraculously preserved 16th-century ghost capital.',
    highlightDetails: [
      'Buland Darwaza (Door of Victory) towering 54 meters over the plain.',
      'White marble Tomb of Sufi Saint Salim Chishti adorned with wishing threads.',
      'Panch Mahal 5-story wind tower inspired by Buddhist temple geometry.'
    ],
    bestTimeToVisit: 'Morning 8:00 AM - 11:00 AM',
    entryFee: '₹50 for Indians, ₹610 for Foreigners'
  },
  {
    id: 'qutub-minar',
    title: 'Qutub Minar Complex',
    nativeTitle: 'क़ुतुब मीनार',
    category: 'monument',
    categoryLabel: 'Victory Tower & Complex',
    city: 'New Delhi',
    country: 'India',
    latitude: 28.5245,
    longitude: 77.1855,
    imageUrl: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 51000,
    visitDurationMinutes: 90,
    oneLineImportance: 'The world’s tallest brick minaret (72.5m) and a mystery 1,600-year-old rustless metallurgical Iron Pillar.',
    highlightDetails: [
      '72.5-meter fluted red sandstone tower carved with Arabic Quranic calligraphy.',
      '4th-century Gupta Iron Pillar that has never rusted despite centuries of rain.',
      'Quwwat-ul-Islam Mosque built with 27 ancient sculpted Hindu-Jain temple columns.'
    ],
    bestTimeToVisit: '4:00 PM - 6:30 PM (beautifully lit at sunset)',
    entryFee: '₹40 for Indians, ₹600 for Foreigners'
  },

  // Rajasthan Sights
  {
    id: 'hawa-mahal',
    title: 'Hawa Mahal (Palace of Winds)',
    nativeTitle: 'हवा महल',
    category: 'palace',
    categoryLabel: 'Rajput Palace',
    city: 'Jaipur',
    country: 'India',
    latitude: 26.9239,
    longitude: 75.8267,
    imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 68000,
    visitDurationMinutes: 60,
    oneLineImportance: 'Iconic 5-story pink honeycomb facade with 953 lattice windows engineered to cool the palace through natural breeze currents.',
    highlightDetails: [
      'Designed in the shape of Lord Krishna’s crown by Lal Chand Ustad in 1799.',
      'Contains zero stairs — floors are connected purely by smooth ramps for royal palanquins.',
      'Vibrant colored stained-glass windows projecting kaleidoscopic light across royal rooms.'
    ],
    bestTimeToVisit: 'Early morning (9:00 AM - 10:30 AM) when the sun hits the pink facade',
    entryFee: '₹50 for Indians, ₹200 for Foreigners'
  },
  {
    id: 'amber-fort',
    title: 'Amer Fort & Palace',
    nativeTitle: 'आमेर का किला',
    category: 'fort',
    categoryLabel: 'Hilltop Fortress',
    city: 'Jaipur',
    country: 'India',
    latitude: 26.9855,
    longitude: 75.8513,
    imageUrl: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 74000,
    visitDurationMinutes: 180,
    oneLineImportance: 'Magnificent hilltop fortress featuring the world-famous Sheesh Mahal where a single candle illuminates the entire mirrored ceiling.',
    highlightDetails: [
      'Sheesh Mahal (Hall of Mirrors) inlaid with convex Belgian glass crystals.',
      'Overlooking Maota Lake and the saffron garden island of Kesar Kyari.',
      'Underground secret tunnel system connecting 2 kilometers to Jaigarh Fort.'
    ],
    bestTimeToVisit: '8:30 AM - 12:00 PM or Night Illumination Tour',
    entryFee: '₹100 for Indians, ₹500 for Foreigners'
  },

  // Varanasi Spiritual Sights
  {
    id: 'kashi-vishwanath',
    title: 'Kashi Vishwanath Temple & Corridor',
    nativeTitle: 'काशी विश्वनाथ मंदिर',
    category: 'spiritual',
    categoryLabel: 'Sacred Jyotirlinga',
    city: 'Varanasi',
    country: 'India',
    latitude: 25.3109,
    longitude: 83.0107,
    imageUrl: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 88000,
    visitDurationMinutes: 120,
    oneLineImportance: 'One of Hinduism’s most sacred 12 Jyotirlingas, crowned by a 1-tonne pure gold spire in the world’s oldest continuously inhabited city.',
    highlightDetails: [
      'Spire plated with 800 kilograms of gold donated by Maharaja Ranjit Singh.',
      'Newly inaugurated grand riverfront heritage corridor connecting directly to the Ganga Ghats.',
      'Soul-stirring early morning Mangala Aarti rituals.'
    ],
    bestTimeToVisit: 'Early morning 4:00 AM - 7:00 AM for serenity',
    entryFee: 'Free (Special VIP Sugam Darshan ₹300)'
  },
  {
    id: 'dashashwamedh-ghat',
    title: 'Dashashwamedh Ghat & Ganga Aarti',
    nativeTitle: 'दशाश्वमेध घाट',
    category: 'spiritual',
    categoryLabel: 'Holy Riverfront Ghat',
    city: 'Varanasi',
    country: 'India',
    latitude: 25.3076,
    longitude: 83.0104,
    imageUrl: 'https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 65000,
    visitDurationMinutes: 90,
    oneLineImportance: 'The grandest riverfront ghat on the sacred Ganges, world-famous for its mesmerizing synchronized multi-tiered brass lamp evening Aarti.',
    highlightDetails: [
      'Spectacular sunset Maha Aarti ceremony performed with conch shells and incense smoke.',
      'Sunrise wooden rowing boat rides along the crescent-shaped sacred river.',
      'Mythological site where Lord Brahma performed the 10-horse sacrifice.'
    ],
    bestTimeToVisit: 'Sunset (6:00 PM - 7:30 PM) or Sunrise (5:30 AM)',
    entryFee: 'Free to attend on ghat steps'
  },

  // Global Landmark Sights
  {
    id: 'eiffel-tower',
    title: 'Eiffel Tower & Champ de Mars',
    nativeTitle: 'Tour Eiffel',
    category: 'monument',
    categoryLabel: 'Architectural Icon',
    city: 'Paris',
    country: 'France',
    latitude: 48.8584,
    longitude: 2.2945,
    imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 140000,
    visitDurationMinutes: 120,
    oneLineImportance: 'The 330-meter wrought-iron symbol of Paris offering panoramic 360-degree skyline views and sparkling hourly night illuminations.',
    highlightDetails: [
      'Engineered with 18,000 iron pieces and 2.5 million rivets for the 1889 World Fair.',
      'Top-level summit platform featuring Gustave Eiffel’s restored historic private office.',
      'Lighted by 20,000 sparkling xenon lamps every hour after nightfall.'
    ],
    bestTimeToVisit: '1 hour before sunset for dual daytime and twilight skyline views',
    entryFee: '€11 - €28 (Depending on lift or stairs)'
  },
  {
    id: 'colosseum',
    title: 'The Roman Colosseum & Forum',
    nativeTitle: 'Colosseo',
    category: 'monument',
    categoryLabel: 'Ancient Roman Amphitheatre',
    city: 'Rome',
    country: 'Italy',
    latitude: 41.8902,
    longitude: 12.4922,
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 135000,
    visitDurationMinutes: 150,
    oneLineImportance: 'The largest amphitheater ever built in antiquity, legendary for gladiatorial spectacles and intricate subterranean hypogeum cages.',
    highlightDetails: [
      'Hypogeum underground labyrinth where wild beasts and gladiators were held.',
      'Engineering marvel built with travertine limestone seating 65,000 Roman citizens.',
      'Combined ticket grants immediate access to the adjacent ruins of the Roman Forum.'
    ],
    bestTimeToVisit: '8:30 AM morning opening or late afternoon',
    entryFee: '€16 - €22'
  },
  {
    id: 'fushimi-inari',
    title: 'Fushimi Inari-Taisha Shrine',
    nativeTitle: '伏見稲荷大社',
    category: 'spiritual',
    categoryLabel: 'Shinto Shrine & Mountain',
    city: 'Kyoto',
    country: 'Japan',
    latitude: 34.9671,
    longitude: 135.7727,
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 82000,
    visitDurationMinutes: 150,
    oneLineImportance: 'Famous mountain pathway flanked by 10,000 vibrant vermilion Torii gates winding through tranquil cedar sacred forests.',
    highlightDetails: [
      'Senbon Torii dense tunnel of thousands of donated vermilion wooden arches.',
      'Dozens of stone Kitsune fox statues acting as messengers of Inari, the god of rice.',
      'Summit mountain trails overlooking the panoramic Kyoto basin.'
    ],
    bestTimeToVisit: 'Early morning (6:30 AM) or peaceful atmospheric night hike',
    entryFee: 'Free entry (Open 24/7)'
  }
];

// Helper: Haversine distance in Kilometers
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// Famous Tourist City Hubs for quick switching
export interface CityHub {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  highlightSight: string;
}

export const FAMOUS_CITY_HUBS: CityHub[] = [
  { name: 'Nagpur (Orange City)', country: 'India', latitude: 21.1458, longitude: 79.0882, highlightSight: 'Tekdi Ganesh & Deekshabhoomi' },
  { name: 'Madurai (Meenakshi)', country: 'India', latitude: 9.9195, longitude: 78.1193, highlightSight: 'Meenakshi Amman Temple' },
  { name: 'Agra (Taj Mahal)', country: 'India', latitude: 27.1751, longitude: 78.0421, highlightSight: 'Taj Mahal & Agra Fort' },
  { name: 'Jaipur (Pink City)', country: 'India', latitude: 26.9239, longitude: 75.8267, highlightSight: 'Hawa Mahal & Amer Fort' },
  { name: 'Varanasi (Kashi)', country: 'India', latitude: 25.3109, longitude: 83.0107, highlightSight: 'Vishwanath & Ganga Ghats' },
  { name: 'Delhi (Heritage)', country: 'India', latitude: 28.5245, longitude: 77.1855, highlightSight: 'Qutub Minar & Red Fort' },
  { name: 'Paris (France)', country: 'France', latitude: 48.8584, longitude: 2.2945, highlightSight: 'Eiffel Tower & Louvre' },
  { name: 'Rome (Italy)', country: 'Italy', latitude: 41.8902, longitude: 12.4922, highlightSight: 'Colosseum & Vatican' },
  { name: 'Kyoto (Japan)', country: 'Japan', latitude: 34.9671, longitude: 135.7727, highlightSight: 'Fushimi Inari Shrine' },
];
