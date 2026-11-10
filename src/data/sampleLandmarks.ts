import { RecognitionResult, NearbyLandmark } from '../types';

export const SAMPLE_LANDMARKS: RecognitionResult[] = [
  {
    id: 'meenakshi-temple',
    title: 'Meenakshi Amman Temple',
    nativeTitle: 'மீனாட்சி அம்மன் கோவில்',
    category: 'temple',
    confidence: 0.99,
    locationName: 'Madurai, Tamil Nadu, India',
    historicalPeriod: 'Pandya & Nayak Dynasties (6th–17th Century AD)',
    ocrDetectedText: 'SRI MEENAKSHI SUNDARESWARAR TEMPLE - MADURAI',
    summary: 'A historic Dravidian Hindu temple dedicated to Goddess Meenakshi and Lord Sundareswarar, celebrated for its 14 towering gopurams encrusted with 33,000 colorful stucco sculptures.',
    narration: 'Vanakkam! Welcome to the glorious Meenakshi Amman Temple in Madurai, the spiritual heart of Tamil Nadu! Standing before these towering gateway Gopurams, look closely at the thousands of intricately hand-painted deities, mythical demons, and celestial guardians sculpted into the tiers. This sacred temple complex covers 14 acres and was reconstructed in its present grandeur by King Thirumalai Nayak. Notice the golden flagstaff and the famous Hall of Thousand Pillars, where each monolithic granite column rings with melodic tones when tapped!',
    keyFacts: [
      'Houses 14 majestic gateway towers (Gopurams), the tallest South Tower reaching 52 meters (170 feet).',
      'Encrusted with over 33,000 colorful, finely detailed multi-hued stucco sculptures.',
      'The Aayiram Kaal Mandapam (Hall of 1,000 Pillars) contains 985 exquisitely carved stone pillars with musical tones.',
      'Centuries-old Golden Lotus Tank (Porthamarai Kulam) served as the meeting ground for the historic Tamil Sangam academy.'
    ],
    architecturalHighlights: [
      'Pyramidal Dravidian Gopurams richly adorned with mythological relief sculptures.',
      'Golden vimanas (sanctum towers) crowned with pure gold kalasam crests.',
      'Monolithic musical pillars carved from single blocks of resonant granite rock.',
      'Vast concentric corridor quadrangles aligned according to ancient Vastu Shastra.'
    ],
    suggestedQuestions: [
      'Why does Meenakshi Amman hold a green parrot in her right hand?',
      'How are the 33,000 sculptures repainted and maintained during Kumbhabhishekam?',
      'What is the secret of the musical pillars in the 1,000-pillar hall?'
    ],
    culturalSignificance: 'Nominated among the New Seven Wonders of the World and celebrated as the crown jewel of ancient Dravidian temple architecture.',
    audioDurationSeconds: 52,
    timestamp: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1000&q=80',
    supplementaryImages: [
      {
        id: 'meenakshi-supp-1',
        url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=800&q=80',
        title: 'South Gopuram Sculpture Detailing',
        caption: 'Multi-tiered stucco deities and celestial vahanas painted in vivid traditional pigments',
        type: 'detail'
      },
      {
        id: 'meenakshi-supp-2',
        url: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
        title: 'Hall of Thousand Pillars (Aayiram Kaal Mandapam)',
        caption: 'Symmetrical Dravidian stone colonnade carved with avatars of Lord Shiva and Goddess Shakti',
        type: 'interior'
      },
      {
        id: 'meenakshi-supp-3',
        url: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80',
        title: 'Golden Lotus Pond (Porthamarai Kulam)',
        caption: 'Sacred stepped water reservoir where ancient Tamil Sangam literary manuscripts were consecrated',
        type: 'historical'
      }
    ],
    coords: { latitude: 9.9195, longitude: 78.1193, city: 'Madurai', country: 'India' },
    tags: ['Dravidian', 'Gopuram', 'Madurai', 'Tamil Nadu', 'Hindu Temple']
  },
  {
    id: 'taj-mahal',
    title: 'Taj Mahal',
    nativeTitle: 'ताज महल',
    category: 'monument',
    confidence: 0.99,
    locationName: 'Agra, Uttar Pradesh, India',
    historicalPeriod: 'Mughal Empire (1631–1653 AD)',
    ocrDetectedText: 'WORLD HERITAGE SITE - TAJ MAHAL - ASI',
    summary: 'An immense mausoleum of white marble, built in Agra by order of the Mughal emperor Shah Jahan in memory of his favorite wife Mumtaz Mahal.',
    narration: 'Welcome to the Taj Mahal! Standing gracefully on the southern bank of the Yamuna River, this jewel of Muslim art in India is crafted from pure white Makrana marble. Notice how the central dome is flanked by four identical minarets, slightly tilted outwards so that in the event of an earthquake, they would fall away from the tomb. Shah Jahan employed over 20,000 artisans from across Persia, Central Asia, and Europe to craft the intricate Pietra Dura stone inlays you see around the main arches.',
    keyFacts: [
      'Built between 1631 and 1653 by Mughal Emperor Shah Jahan.',
      'Decorated with 28 types of precious and semi-precious stones including lapis lazuli and jade.',
      'Design incorporates perfect symmetry, except for the sarcophagi inside where Shah Jahan’s tomb breaks the center line.',
      'Appears in changing hues from soft pink at dawn to milky white at noon and golden under moonlight.'
    ],
    architecturalHighlights: [
      'Onion-shaped main marble dome measuring 35 meters in height.',
      'Pietra Dura (Parchin Kari) marble inlay floral art.',
      'Four 40-meter minarets engineered with anti-seismic outward slant.',
      'Charbagh formal gardens representing Islamic Paradise.'
    ],
    suggestedQuestions: [
      'Who designed the Taj Mahal?',
      'Is it true there was going to be a Black Taj Mahal?',
      'What precious stones were used in the marble inlays?'
    ],
    culturalSignificance: 'Designated a UNESCO World Heritage Site in 1983 as "the jewel of Muslim art in India and one of the universally admired masterpieces of the world’s heritage."',
    audioDurationSeconds: 48,
    timestamp: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1000&q=80',
    supplementaryImages: [
      {
        id: 'taj-supp-1',
        url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
        title: 'River Yamuna Historical Vantage',
        caption: 'View from Mehtab Bagh where Shah Jahan watched the reflection at twilight',
        type: 'historical'
      },
      {
        id: 'taj-supp-2',
        url: 'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?auto=format&fit=crop&w=800&q=80',
        title: 'Pietra Dura Floral Inlay',
        caption: 'Hand-carved marble inlay with semi-precious carnelian and malachite gemstones',
        type: 'detail'
      },
      {
        id: 'taj-supp-3',
        url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80',
        title: 'Nocturnal Moonlight Ambiance',
        caption: 'Luminescent Makrana marble illuminated under evening sky',
        type: 'night'
      },
      {
        id: 'taj-supp-4',
        url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
        title: 'Darwaza-i-Rauza (Great Gate)',
        caption: 'Monolithic red sandstone entryway with Arabic calligraphy inscriptions',
        type: 'interior'
      }
    ],
    coords: { latitude: 27.1751, longitude: 78.0421, city: 'Agra', country: 'India' },
    tags: ['Mughal', 'UNESCO', 'Marble', 'Agra', 'Seven Wonders']
  },
  {
    id: 'eiffel-tower',
    title: 'Eiffel Tower',
    nativeTitle: 'Tour Eiffel',
    category: 'monument',
    confidence: 0.98,
    locationName: 'Paris, France',
    historicalPeriod: 'Industrial Era (1889 AD)',
    ocrDetectedText: 'EXPOSITION UNIVERSELLE 1889 - CHAMP DE MARS',
    summary: 'A wrought-iron lattice tower on the Champ de Mars in Paris, named after the engineer Gustave Eiffel, whose company designed and built the tower.',
    narration: 'You are viewing the iconic Eiffel Tower! Constructed for the 1889 World Fair to celebrate the centennial of the French Revolution, it stands 330 meters tall. Originally intended to be dismantled after 20 years, it was saved because of its utility as a wireless telegraph transmitter. It is made of over 18,000 puddle iron parts held together by 2.5 million rivets.',
    keyFacts: [
      'Erected in just 2 years, 2 months, and 5 days.',
      'Grows up to 15 cm taller in summer due to thermal expansion of the iron.',
      'Repainted every 7 years using 60 tonnes of paint to prevent rusting.',
      'Lighted by 20,000 sparkling bulbs every evening.'
    ],
    architecturalHighlights: [
      'Wrought-iron lattice framework engineered to withstand strong wind pressures.',
      'Three accessible levels with panoramic views of Paris.',
      'Puddle iron puddle process giving high resistance to atmospheric corrosion.'
    ],
    suggestedQuestions: [
      'How was the Eiffel Tower constructed so quickly?',
      'Why did Parisians initially dislike the tower?',
      'Can you go inside Gustave Eiffel’s secret apartment at the top?'
    ],
    culturalSignificance: 'Global cultural icon of France and one of the most recognizable structures in the human world.',
    audioDurationSeconds: 42,
    timestamp: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=1000&q=80',
    supplementaryImages: [
      {
        id: 'eiffel-supp-1',
        url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
        title: '1889 Exposition Universelle Archive',
        caption: 'Historic architectural engraving during the Paris World Fair centennial',
        type: 'historical'
      },
      {
        id: 'eiffel-supp-2',
        url: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=800&q=80',
        title: 'Interior Lattice Girder Beams',
        caption: 'Underneath the first floor platform looking up into the iron rivets and lift elevator shafts',
        type: 'interior'
      },
      {
        id: 'eiffel-supp-3',
        url: 'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?auto=format&fit=crop&w=800&q=80',
        title: 'Midnight Strobe Beacon Lightshow',
        caption: 'Illuminated at night by 20,000 xenon lamps sweeping across the Paris skyline',
        type: 'night'
      }
    ],
    coords: { latitude: 48.8584, longitude: 2.2945, city: 'Paris', country: 'France' },
    tags: ['Paris', 'Iron Architecture', 'World Fair', 'France']
  },
  {
    id: 'hawa-mahal',
    title: 'Hawa Mahal (Palace of Breeze)',
    nativeTitle: 'हवा महल',
    category: 'fort',
    confidence: 0.97,
    locationName: 'Jaipur, Rajasthan, India',
    historicalPeriod: 'Rajput Architecture (1799 AD)',
    ocrDetectedText: 'HAWA MAHAL - PINK CITY HERITAGE',
    summary: 'A 5-story palace constructed of red and pink sandstone with 953 small honeycomb windows (Jharokhas).',
    narration: 'This is the breathtaking Hawa Mahal, or Palace of Winds! Built in 1799 by Maharaja Sawai Pratap Singh, its unique facade resembles the crown of Lord Krishna. The 953 lattice windows allowed royal ladies to observe street festivals below unseen, while the Venturi effect created a refreshing breeze through the chambers during hot summers.',
    keyFacts: [
      'Built without a solid foundation; stands on a curved base that leans at an 87-degree angle.',
      'Contains no staircases to upper floors; access is through inclined ramps.',
      'The pink color symbolises hospitality, painted in 1876 for the Prince of Wales.'
    ],
    architecturalHighlights: [
      'Fusion of Rajput craft and Mughal arch motifs.',
      '953 intricate Jharokha latticework windows with stained glass.',
      'Cooling natural air circulation system.'
    ],
    suggestedQuestions: [
      'Why are there no stairs inside Hawa Mahal?',
      'How does the natural air cooling work?',
      'Who designed this unique facade?'
    ],
    culturalSignificance: 'An architectural emblem of Jaipur, the Pink City of Rajasthan.',
    audioDurationSeconds: 40,
    timestamp: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1000&q=80',
    supplementaryImages: [
      {
        id: 'hawa-supp-1',
        url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80',
        title: 'City Palace Peacock Courtyard',
        caption: 'Adjacent royal palace chambers and mosaic peacock gates',
        type: 'interior'
      },
      {
        id: 'hawa-supp-2',
        url: 'https://images.unsplash.com/photo-1588083949474-77b7093320d6?auto=format&fit=crop&w=800&q=80',
        title: 'Jaipur Pink Sandstone Carvings',
        caption: 'Intricate floral jali lattice panels allowing royal seclusion',
        type: 'detail'
      }
    ],
    coords: { latitude: 26.9239, longitude: 75.8267, city: 'Jaipur', country: 'India' },
    tags: ['Jaipur', 'Pink City', 'Rajput', 'Heritage']
  },
  {
    id: 'masala-dosa',
    title: 'South Indian Masala Dosa',
    nativeTitle: 'मसाला डोसा',
    category: 'food',
    confidence: 0.96,
    locationName: 'South India',
    historicalPeriod: 'Ancient Culinary Tradition (1st Century AD)',
    ocrDetectedText: 'SPECIAL MYSORE MASALA DOSA & FILTER COFFEE',
    summary: 'A crisp fermented crepe made from rice batter and black lentils, stuffed with spiced potato filling.',
    narration: 'Ah, you are looking at Masala Dosa, one of India’s most cherished culinary masterpieces! Originating in Udupi, Karnataka, it features a golden-crisp crepe made from naturally fermented rice and urad dal batter. Inside is a fragrant spiced filling of boiled potatoes, mustard seeds, curry leaves, and turmeric, served alongside coconut chutney and piping hot sambar.',
    keyFacts: [
      'Fermentation creates probiotic benefits and easy digestibility.',
      'Ranked among the top 50 most delicious foods in the world by CNN Travel.',
      'Traditionally cooked on a heavy cast-iron tawa greased with ghee or butter.'
    ],
    architecturalHighlights: [
      'Paper-thin crispy texture with soft aromatic potato center.',
      'Served with coconut-coriander chutney, tomato chutney, and lentil sambar.'
    ],
    suggestedQuestions: [
      'What is the difference between Mysore Masala Dosa and Plain Dosa?',
      'How is the batter prepared and fermented?',
      'What traditional beverage pairs best with Dosa?'
    ],
    culturalSignificance: 'A staple of South Indian heritage breakfast and street food culture enjoyed globally.',
    audioDurationSeconds: 38,
    timestamp: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1000&q=80',
    supplementaryImages: [
      {
        id: 'dosa-supp-1',
        url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
        title: 'Chutneys & Traditional Sambar Podi',
        caption: 'Trio of fresh coconut chutney, roasted tomato chutney, and drumstick sambar',
        type: 'detail'
      },
      {
        id: 'dosa-supp-2',
        url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
        title: 'Cast-Iron Tawa Griddle Roasting',
        caption: 'Spreading the fermented batter in swift concentric circles over hot ghee',
        type: 'historical'
      }
    ],
    coords: { latitude: 12.9716, longitude: 77.5946, city: 'Bengaluru', country: 'India' },
    tags: ['Culinary', 'South India', 'Street Food', 'Dosa']
  },
  {
    id: 'tekdi-ganesh-mandir',
    title: 'Shree Ganesh Mandir Tekdi',
    nativeTitle: 'श्री गणेश मंदिर टेकडी',
    category: 'temple',
    confidence: 0.99,
    locationName: 'Nagpur, Maharashtra, India',
    historicalPeriod: '18th Century Bhosale Era (c. 1760 AD)',
    ocrDetectedText: 'SHREE GANESH MANDIR TEKDI - NAGPUR',
    summary: 'A 250-year-old Swayambhu (self-manifested) Ganesh shrine perched on a natural rock ridge overlooking Nagpur railway junction.',
    narration: 'Namaskar and welcome to Shree Ganesh Mandir Tekdi, the most revered spiritual landmark of Nagpur! Perched on a serene hillock overlooking the railway station, this ancient swayambhu (self-manifested) deity is believed to expand naturally over decades. Devotees and travelers from across India begin their journeys with blessings at this sacred shrine.',
    keyFacts: [
      'Over 250 years old, dating back to the Bhosale dynasty rule in Vidarbha.',
      'The Ganesha idol is self-originated (Swayambhu) directly from the natural hill rock.',
      'Surrounded by historic Peepal trees where pilgrims perform sacred circumambulations.'
    ],
    architecturalHighlights: [
      'Natural rock sanctum integrated into the hill elevation.',
      'Ornate brass and silver repoussé work in the inner garbha griha.',
      'Panoramic hill vistas overlooking the historic central Nagpur corridor.'
    ],
    suggestedQuestions: [
      'What is the meaning of "Tekdi" in Marathi?',
      'Why is this Swayambhu Ganesha considered the protector of travelers in Nagpur?',
      'What are the special timings for morning Kakad Aarti?'
    ],
    culturalSignificance: 'The foremost guardian deity of Nagpur and the Vidarbha region.',
    audioDurationSeconds: 42,
    timestamp: new Date().toISOString(),
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Shri_Ganesh_Tekdi.jpg/1200px-Shri_Ganesh_Tekdi.jpg',
    coords: { latitude: 21.1492, longitude: 79.0911, city: 'Nagpur', country: 'India' },
    tags: ['Nagpur', 'Tekdi Ganesh', 'Maharashtra', 'Hindu Temple', 'Swayambhu']
  },
  {
    id: 'sitabuldi-fort',
    title: 'Sitabuldi Fort & War Memorial',
    nativeTitle: 'सीताबर्डी किल्ला',
    category: 'fort',
    confidence: 0.98,
    locationName: 'Nagpur, Maharashtra, India',
    historicalPeriod: 'Bhosale Maratha & British Raj (1817 AD)',
    ocrDetectedText: 'SITABULDI FORT - BATTLE OF 1817 MEMORIAL',
    summary: 'Historic hilltop fort that witnessed the fateful 1817 Battle of Sitabuldi, offering 360-degree views of Nagpur.',
    narration: 'Welcome to Sitabuldi Fort! Standing atop twin hillocks in the heart of Nagpur, this fortified citadel was the site of the fierce Battle of Sitabuldi fought in November 1817 between Appasaheb Bhosale’s Maratha forces and the British East India Company. Today it houses a poignant war memorial and provides a commanding view of the orange city skyline.',
    keyFacts: [
      'Witnessed the decisive 1817 Battle of Sitabuldi during the Third Anglo-Maratha War.',
      'Features British and Maratha cannon bastions and defensive ramparts.',
      'Houses a historic war memorial obelisk dedicated to fallen soldiers.'
    ],
    architecturalHighlights: [
      'Twin hillock stone curtain walls and ramparts.',
      'Colonial stone gates and ammunition store vaults.',
      '360-degree observation vantage over Nagpur city.'
    ],
    suggestedQuestions: [
      'What happened during the 1817 Battle of Sitabuldi?',
      'When is Sitabuldi Fort open to the general public?',
      'How was the fort defended using the twin hillock geography?'
    ],
    culturalSignificance: 'A major historic monument symbolizing Vidarbha’s military heritage and colonial struggle.',
    audioDurationSeconds: 45,
    timestamp: new Date().toISOString(),
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Sitabuldi_fort_gate.JPG/1200px-Sitabuldi_fort_gate.JPG',
    coords: { latitude: 21.1472, longitude: 79.0838, city: 'Nagpur', country: 'India' },
    tags: ['Nagpur', 'Sitabuldi', 'Fortress', 'Battle of 1817', 'War Memorial']
  }
];

export const NEARBY_LANDMARKS_SAMPLE: NearbyLandmark[] = [
  {
    id: 'tekdi-ganesh',
    title: 'Shree Ganesh Mandir Tekdi',
    category: 'Spiritual',
    distanceMeters: 450,
    teaser: '250-year-old self-manifested hill shrine guardian of Nagpur.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Shri_Ganesh_Tekdi.jpg/1200px-Shri_Ganesh_Tekdi.jpg',
    lat: 21.1492,
    lng: 79.0911,
    rating: 4.9
  },
  {
    id: 'sitabuldi-fort',
    title: 'Sitabuldi Fort',
    category: 'Fortress',
    distanceMeters: 800,
    teaser: 'Historical 1817 battle citadel offering panoramic 360-degree city views.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Sitabuldi_fort_gate.JPG/1200px-Sitabuldi_fort_gate.JPG',
    lat: 21.1472,
    lng: 79.0838,
    rating: 4.5
  },
  {
    id: 'taj-mahal',
    title: 'Taj Mahal',
    category: 'Monument',
    distanceMeters: 350,
    teaser: 'World Heritage white marble mausoleum with symmetrical Mughal gardens.',
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80',
    lat: 27.1751,
    lng: 78.0421,
    rating: 4.9
  },
  {
    id: 'agra-fort',
    title: 'Agra Fort',
    category: 'Fortress',
    distanceMeters: 2100,
    teaser: 'Red sandstone fortress palace where Emperor Shah Jahan spent his final years.',
    imageUrl: 'https://images.unsplash.com/photo-1588083949474-77b7093320d6?auto=format&fit=crop&w=400&q=80',
    lat: 27.1795,
    lng: 78.0211,
    rating: 4.8
  },
  {
    id: 'mehtab-bagh',
    title: 'Mehtab Bagh',
    category: 'Landscape Garden',
    distanceMeters: 850,
    teaser: 'Moonlight garden complex directly across the Yamuna river offering reflection views.',
    imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=400&q=80',
    lat: 27.1800,
    lng: 78.0425,
    rating: 4.7
  }
];
