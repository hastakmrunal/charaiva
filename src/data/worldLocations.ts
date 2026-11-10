export interface CityLocationInfo {
  name: string;
  latitude: number;
  longitude: number;
  tagline: string;
  photoUrl?: string;
  topLandmarks?: string[];
  famousFoods?: string[];
}

export interface StateInfo {
  name: string;
  code?: string;
  cities: CityLocationInfo[];
}

export interface CountryInfo {
  name: string;
  code: string;
  flag: string;
  states: StateInfo[];
}

export const WORLD_LOCATIONS: CountryInfo[] = [
  {
    name: 'India',
    code: 'IN',
    flag: '🇮🇳',
    states: [
      {
        name: 'Maharashtra',
        code: 'MH',
        cities: [
          {
            name: 'Nagpur',
            latitude: 21.1458,
            longitude: 79.0882,
            tagline: 'The Orange City & Zero Mile Center of India',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Deeksha_Bhoomi_Nagpur.JPG/1200px-Deeksha_Bhoomi_Nagpur.JPG',
            topLandmarks: ['Deekshabhoomi', 'Shree Ganesh Mandir Tekdi', 'Futala Lake', 'Zero Mile Stone', 'Sitabuldi Fort'],
            famousFoods: ['Nagpur Tarri Poha', 'Saoji Mutton Curry', 'Haldiram\'s Sweets', 'Orange Barfi']
          },
          {
            name: 'Mumbai',
            latitude: 18.9220,
            longitude: 72.8347,
            tagline: 'City of Dreams & Victorian Gothic Heritage',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Gateway_of_India_Mumbai.jpg/1200px-Gateway_of_India_Mumbai.jpg',
            topLandmarks: ['Gateway of India', 'CSMT Heritage Terminus', 'Marine Drive', 'Elephanta Caves', 'Haji Ali Dargah'],
            famousFoods: ['Vada Pav', 'Pav Bhaji', 'Bombay Duck', 'Brun Maska & Chai']
          },
          {
            name: 'Pune',
            latitude: 18.5204,
            longitude: 73.8567,
            tagline: 'Oxford of the East & Maratha Cultural Capital',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Shaniwar_wada_Pune.jpg/1200px-Shaniwar_wada_Pune.jpg',
            topLandmarks: ['Shaniwar Wada', 'Aga Khan Palace', 'Sinhagad Fort', 'Dagdusheth Halwai Ganpati', 'Pataleshwar Caves'],
            famousFoods: ['Puneri Misal Pav', 'Bakharwadi', 'Sujata Mastani', 'Pithla Bhakri']
          },
          {
            name: 'Aurangabad (Chhatrapati Sambhajinagar)',
            latitude: 19.8762,
            longitude: 75.3433,
            tagline: 'Gateway to UNESCO Ajanta & Ellora Caves',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Bibi_Ka_Maqbara_Front_View.jpg/1200px-Bibi_Ka_Maqbara_Front_View.jpg',
            topLandmarks: ['Ellora Caves (Kailasa Temple)', 'Ajanta Caves', 'Bibi Ka Maqbara', 'Daulatabad Fort', 'Grishneshwar Jyotirlinga'],
            famousFoods: ['Naan Qalia', 'Tahri', 'Aurangabadi Biryani', 'Himroo Shawl Heritage']
          },
          {
            name: 'Nashik',
            latitude: 19.9975,
            longitude: 73.7898,
            tagline: 'Spiritual Kumbh Mela City & Wine Capital of India',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Trimbakeshwar_Temple_Nashik.jpg/1200px-Trimbakeshwar_Temple_Nashik.jpg',
            topLandmarks: ['Trimbakeshwar Jyotirlinga', 'Panchavati & Ramkund', 'Pandavleni Caves', 'Sula Vineyards', 'Kalaram Temple'],
            famousFoods: ['Misal Pav (Sadhana / Katkirr)', 'Kondaji Chivda', 'Nashik Grapes & Guavas']
          },
          {
            name: 'Kolhapur',
            latitude: 16.7050,
            longitude: 74.2433,
            tagline: 'City of Mahalaxmi Temple & Royal Maratha Heritage',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Mahalaxmi_Temple_Kolhapur.jpg/1200px-Mahalaxmi_Temple_Kolhapur.jpg',
            topLandmarks: ['Mahalaxmi (Ambabai) Temple', 'New Palace & Chhatrapati Shahu Museum', 'Panhala Fort', 'Rankala Lake'],
            famousFoods: ['Kolhapuri Tambda & Pandhra Rassa', 'Kolhapuri Misal', 'Jaggery & Chappals']
          }
        ]
      },
      {
        name: 'Tamil Nadu',
        code: 'TN',
        cities: [
          {
            name: 'Madurai',
            latitude: 9.9195,
            longitude: 78.1193,
            tagline: 'The Ancient City of Temples & Jasmine',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Madurai_Meenakshi_Amman_Temple_East_Tower.jpg/1200px-Madurai_Meenakshi_Amman_Temple_East_Tower.jpg',
            topLandmarks: ['Meenakshi Amman Temple', 'Thirumalai Nayakkar Mahal', 'Gandhi Memorial Museum', 'Koodal Azhagar Temple'],
            famousFoods: ['Famous Madurai Jigarthanda', 'Madurai Kari Dosa', 'Bun Parotta', 'Filter Coffee']
          },
          {
            name: 'Chennai',
            latitude: 13.0827,
            longitude: 80.2707,
            tagline: 'Cultural Capital of South India & Marina Coast',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Chennai_Central.jpg/1200px-Chennai_Central.jpg',
            topLandmarks: ['Kapaleeshwarar Temple', 'Marina Beach Promenade', 'Fort St. George', 'Santhome Cathedral Basilica'],
            famousFoods: ['South Indian Filter Coffee', 'Masala Dosa with Chutneys', 'Idli Sambar', 'Chettinad Fish Curry']
          },
          {
            name: 'Thanjavur',
            latitude: 10.7870,
            longitude: 79.1378,
            tagline: 'Cradle of Chola Architecture & Brihadisvara Temple',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Brihadisvara_Temple_Thanjavur.jpg/1200px-Brihadisvara_Temple_Thanjavur.jpg',
            topLandmarks: ['Brihadisvara Temple (Big Temple)', 'Thanjavur Maratha Palace', 'Saraswathi Mahal Library', 'Schwartz Church'],
            famousFoods: ['Thanjavur Asoka Halwa', 'Vada Curry', 'Traditional Banana Leaf Meals']
          },
          {
            name: 'Rameswaram',
            latitude: 9.2876,
            longitude: 79.3129,
            tagline: 'Sacred Island Temple & Pamban Bridge Over the Ocean',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ramanathaswamy_Temple_Corridor.jpg/1200px-Ramanathaswamy_Temple_Corridor.jpg',
            topLandmarks: ['Ramanathaswamy Temple Pillared Corridors', 'Pamban Sea Bridge', 'Dhanushkodi Ghost Town', 'Dr. APJ Abdul Kalam Memorial'],
            famousFoods: ['Coastal Seafood', 'Rameswaram Lattu & Prasadam', 'Fresh Coconut Water']
          },
          {
            name: 'Coimbatore',
            latitude: 11.0168,
            longitude: 76.9558,
            tagline: 'Manchester of South India & Foothills of Nilgiris',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Adiyogi_Shiva_Statue_Coimbatore.jpg/1200px-Adiyogi_Shiva_Statue_Coimbatore.jpg',
            topLandmarks: ['Adiyogi 112ft Shiva Statue (Isha Yoga)', 'Marudhamalai Temple', 'Perur Pateeswarar Temple', 'Siruvani Waterfalls'],
            famousFoods: ['Kongu Nadu Chicken', 'Coimbatore Halwa', 'Pallipalayam Chicken']
          }
        ]
      },
      {
        name: 'Uttar Pradesh',
        code: 'UP',
        cities: [
          {
            name: 'Varanasi',
            latitude: 25.3176,
            longitude: 82.9739,
            tagline: 'Spiritual Capital of India & Sacred Ganga Ghats',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Varanasi_Ghats_at_Sunrise.jpg/1200px-Varanasi_Ghats_at_Sunrise.jpg',
            topLandmarks: ['Kashi Vishwanath Temple', 'Dashashwamedh Ghat Ganga Aarti', 'Assi Ghat', 'Sarnath Buddhist Stupa', 'Manikarnika Ghat'],
            famousFoods: ['Banarasi Paan', 'Kachori Jalebi Sabzi', 'Malaiyo (Winter treat)', 'Blue Lassi']
          },
          {
            name: 'Agra',
            latitude: 27.1751,
            longitude: 78.0421,
            tagline: 'City of the Taj Mahal & Mughal World Wonder',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/1200px-Taj_Mahal_%28Edited%29.jpeg',
            topLandmarks: ['Taj Mahal', 'Agra Fort', 'Fatehpur Sikri', 'Itmad-ud-Daulah (Baby Taj)', 'Mehtab Bagh'],
            famousFoods: ['Agra Petha (Angoori, Kesar, Paan)', 'Bedmi Puri with Aloo Sabzi', 'Mughlai Gosht Biryani']
          },
          {
            name: 'Lucknow',
            latitude: 26.8467,
            longitude: 80.9462,
            tagline: 'City of Nawabs, Awadhi Kebabs & Chikan Embroidery',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Bara_Imambara_Lucknow.jpg/1200px-Bara_Imambara_Lucknow.jpg',
            topLandmarks: ['Bara Imambara & Bhool Bhulaiya', 'Chota Imambara', 'Rumi Darwaza', 'The Residency Lucknow', 'Ambedkar Memorial Park'],
            famousFoods: ['Galouti Kebab (Tunday Kababi)', 'Awadhi Dum Biryani', 'Sheermal & Nihari Kulcha', 'Prakash Kulfi Falooda']
          },
          {
            name: 'Ayodhya',
            latitude: 26.7922,
            longitude: 82.1998,
            tagline: 'Sacred Birthplace of Shri Rama & Saryu Riverbank',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Ram_Mandir_Ayodhya_Night.jpg/1200px-Ram_Mandir_Ayodhya_Night.jpg',
            topLandmarks: ['Shri Ram Janmabhoomi Mandir', 'Hanuman Garhi', 'Kanak Bhawan', 'Ram Ki Paidi Ghats', 'Surya Kund'],
            famousFoods: ['Ayodhya Rabri & Peda', 'Desi Ghee Kachori & Sabzi', 'Saryu Lassi']
          },
          {
            name: 'Mathura & Vrindavan',
            latitude: 27.4924,
            longitude: 77.6737,
            tagline: 'Braj Bhoomi & Eternal Leela Land of Lord Krishna',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Prem_Mandir_Vrindavan_Night.jpg/1200px-Prem_Mandir_Vrindavan_Night.jpg',
            topLandmarks: ['Shri Krishna Janmasthan Temple', 'Prem Mandir Vrindavan', 'Banke Bihari Temple', 'Govardhan Hill', 'ISKCON Temple'],
            famousFoods: ['Mathura Peda', 'Makhan Mishri', 'Kachori Jalebi', 'Rabri Falooda']
          }
        ]
      },
      {
        name: 'Rajasthan',
        code: 'RJ',
        cities: [
          {
            name: 'Jaipur',
            latitude: 26.9124,
            longitude: 75.7873,
            tagline: 'The Pink City of Royal Forts & Palaces',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Hawa_Mahal_2011.jpg/1200px-Hawa_Mahal_2011.jpg',
            topLandmarks: ['Hawa Mahal', 'Amer Fort with Elephant Path', 'City Palace Jaipur', 'Jantar Mantar Observatory', 'Nahargarh Fort'],
            famousFoods: ['Dal Baati Churma', 'Pyaaz Kachori (Rawat Mishtan)', 'Ghevar Sweet', 'LMB Sweets Johari Bazaar']
          },
          {
            name: 'Udaipur',
            latitude: 24.5854,
            longitude: 73.7125,
            tagline: 'City of Lakes & Venetian Palaces of Mewar',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/City_Palace%2C_Udaipur_-_Lake_Pichola.jpg/1200px-City_Palace%2C_Udaipur_-_Lake_Pichola.jpg',
            topLandmarks: ['City Palace Complex', 'Lake Pichola & Taj Lake Palace', 'Jag Mandir', 'Saheliyon-ki-Bari', 'Monsoon Palace (Sajjangarh)'],
            famousFoods: ['Laal Maas (Mutton in Mathania chilli)', 'Gatte ki Sabzi', 'Ker Sangri', 'Jalebi at Jagdish Chowk']
          },
          {
            name: 'Jodhpur',
            latitude: 26.2389,
            longitude: 73.0243,
            tagline: 'The Blue City & Imposing Mehrangarh Fort',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Mehrangarh_Fort_Jodhpur.jpg/1200px-Mehrangarh_Fort_Jodhpur.jpg',
            topLandmarks: ['Mehrangarh Fort on Cliff', 'Jaswant Thada White Marble Cenotaph', 'Umaid Bhawan Palace', 'Clock Tower & Sardar Market'],
            famousFoods: ['Mirchi Vada & Mawa Kachori', 'Makhaniya Lassi', 'Panchkuta Curry']
          },
          {
            name: 'Jaisalmer',
            latitude: 26.9157,
            longitude: 70.9083,
            tagline: 'The Golden City of Thar Desert Dunes & Living Fort',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Jaisalmer_Fort_Golden_Hour.jpg/1200px-Jaisalmer_Fort_Golden_Hour.jpg',
            topLandmarks: ['Jaisalmer Sonar Qila (Living Fort)', 'Sam Sand Dunes Desert Safari', 'Patwon Ki Haveli', 'Gadisar Lake'],
            famousFoods: ['Desert Camel Milk Ice Cream', 'Ghotua Ladoo', 'Bajra Roti with Ghee']
          }
        ]
      },
      {
        name: 'Delhi NCR',
        code: 'DL',
        cities: [
          {
            name: 'Delhi',
            latitude: 28.6139,
            longitude: 77.2090,
            tagline: 'The Historic Capital of Empires & Grand Monuments',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/India_Gate_in_New_Delhi_03-2016.jpg/1200px-India_Gate_in_New_Delhi_03-2016.jpg',
            topLandmarks: ['India Gate & Kartavya Path', 'Red Fort (Lal Qila)', 'Qutub Minar Complex', 'Humayun\'s Tomb', 'Lotus Temple (Bahá\'í)'],
            famousFoods: ['Chole Bhature (Sita Ram Diwan Chand)', 'Butter Chicken (Moti Mahal)', 'Chandni Chowk Paranthe Wali Gali', 'Dilli Chaat']
          }
        ]
      },
      {
        name: 'Karnataka',
        code: 'KA',
        cities: [
          {
            name: 'Bengaluru',
            latitude: 12.9716,
            longitude: 77.5946,
            tagline: 'Garden City & High-Tech Silicon Valley of India',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Vidhana_Soudha_Bangalore.jpg/1200px-Vidhana_Soudha_Bangalore.jpg',
            topLandmarks: ['Vidhana Soudha', 'Bangalore Palace', 'Lalbagh Botanical Garden & Glass House', 'Cubbon Park', 'Tipu Sultan\'s Summer Palace'],
            famousFoods: ['Benne Masala Dosa (CTR / Vidyarthi Bhavan)', 'Bisi Bele Bath', 'Mysore Pak', 'Filter Kaapi']
          },
          {
            name: 'Mysuru',
            latitude: 12.2958,
            longitude: 76.6394,
            tagline: 'City of Palaces, Sandalwood & Royal Dasara',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Mysore_Palace_Morning.jpg/1200px-Mysore_Palace_Morning.jpg',
            topLandmarks: ['Mysore Palace (Amba Vilas)', 'Chamundeshwari Temple atop Hill', 'Brindavan Gardens Musical Fountains', 'St. Philomena\'s Cathedral'],
            famousFoods: ['Original Mysore Pak (Guru Sweets)', 'Mysore Masala Dosa', 'Mylari Dosa']
          },
          {
            name: 'Hampi',
            latitude: 15.3350,
            longitude: 76.4600,
            tagline: 'UNESCO World Heritage Ruins of Vijayanagara Empire',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Stone_Chariot_in_Vittala_Temple_Complex%2C_Hampi.jpg/1200px-Stone_Chariot_in_Vittala_Temple_Complex%2C_Hampi.jpg',
            topLandmarks: ['Vittala Temple Stone Chariot', 'Virupaksha Temple', 'Lotus Mahal & Elephant Stables', 'Matanga Hill Viewpoint'],
            famousFoods: ['South Indian Thali', 'Badam Milk', 'Banana Fritters', 'Fresh Tender Coconut']
          }
        ]
      },
      {
        name: 'Punjab',
        code: 'PB',
        cities: [
          {
            name: 'Amritsar',
            latitude: 31.6340,
            longitude: 74.8723,
            tagline: 'The Golden City of Peace & Valour',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amritsar_at_night.jpg/1200px-The_Golden_Temple_of_Amritsar_at_night.jpg',
            topLandmarks: ['Sri Harmandir Sahib (Golden Temple)', 'Jallianwala Bagh Memorial', 'Attari-Wagah Border Ceremony', 'Gobindgarh Fort'],
            famousFoods: ['Amritsari Kulcha with Chole', 'Guru Ka Langar Prashad', 'Giani Tea Stall Malai Lassi', 'Makki di Roti & Sarson da Saag']
          }
        ]
      },
      {
        name: 'Kerala',
        code: 'KL',
        cities: [
          {
            name: 'Kochi (Cochin)',
            latitude: 9.9312,
            longitude: 76.2673,
            tagline: 'Queen of the Arabian Sea & Historic Fort Kochi',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Chinese_fishing_nets_Kochi.jpg/1200px-Chinese_fishing_nets_Kochi.jpg',
            topLandmarks: ['Chinese Fishing Nets', 'Fort Kochi Heritage Quarter', 'Mattancherry Dutch Palace', 'Paradesi Synagogue (Jew Town)'],
            famousFoods: ['Kerala Fish Curry in Coconut Gravy', 'Appam with Stew', 'Karimeen Pollichathu', 'Banana Chips']
          },
          {
            name: 'Alappuzha (Alleppey)',
            latitude: 9.4981,
            longitude: 76.3388,
            tagline: 'Venice of the East & Serene Backwater Houseboats',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Houseboats_in_Alleppey_Backwaters.jpg/1200px-Houseboats_in_Alleppey_Backwaters.jpg',
            topLandmarks: ['Vembanad Lake Backwaters', 'Alleppey Beach & Old Pier', 'Marari Beach', 'Krishnapuram Palace'],
            famousFoods: ['Backwater Duck Roast', 'Kerala Puttu with Kadala Curry', 'Fresh Toddy & Seafood Fry']
          },
          {
            name: 'Munnar',
            latitude: 10.0889,
            longitude: 77.0595,
            tagline: 'Kashmir of South India & Rolling Tea Plantations',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Munnar_Tea_Plantations_Landscape.jpg/1200px-Munnar_Tea_Plantations_Landscape.jpg',
            topLandmarks: ['Eravikulam National Park (Nilgiri Tahr)', 'Mattupetty Dam & Echo Point', 'Tea Museum Tata Tea', 'Top Station Anamudi View'],
            famousFoods: ['Fresh Cardamom Hill Tea', 'Kerala Malabar Parotta', 'Homemade Spiced Chocolates']
          }
        ]
      },
      {
        name: 'Goa',
        code: 'GA',
        cities: [
          {
            name: 'Panaji (Old Goa & North Goa)',
            latitude: 15.4909,
            longitude: 73.8278,
            tagline: 'Pearl of the Orient & UNESCO Portuguese Churches',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Basilica_of_Bom_Jesus_Goa.jpg/1200px-Basilica_of_Bom_Jesus_Goa.jpg',
            topLandmarks: ['Basilica of Bom Jesus (St. Francis Xavier)', 'Se Cathedral', 'Fontainhas Latin Quarter', 'Aguada Fort Lighthouse', 'Miramar Beach'],
            famousFoods: ['Goan Fish Thali', 'Pork Vindaloo / Chicken Xacuti', 'Bebinca Layer Cake', 'Cashew Feni']
          }
        ]
      },
      {
        name: 'Madhya Pradesh',
        code: 'MP',
        cities: [
          {
            name: 'Khajuraho',
            latitude: 24.8318,
            longitude: 79.9199,
            tagline: 'UNESCO Monument of Erotic & Medieval Nagara Sculptures',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Kandariya_Mahadeva_Temple_Khajuraho.jpg/1200px-Kandariya_Mahadeva_Temple_Khajuraho.jpg',
            topLandmarks: ['Kandariya Mahadeva Temple', 'Western Group of Temples', 'Lakshmana Temple', 'Raneh Falls Canyon'],
            famousFoods: ['Bundelkhandi Kadhi', 'Kaju Barfi', 'Mawa Baati']
          },
          {
            name: 'Ujjain',
            latitude: 23.1765,
            longitude: 75.7885,
            tagline: 'Ancient Sacred City of Mahakaleshwar Jyotirlinga',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Mahakaleshwar_Corridor_Ujjain.jpg/1200px-Mahakaleshwar_Corridor_Ujjain.jpg',
            topLandmarks: ['Mahakaleshwar Jyotirlinga (Bhasma Aarti)', 'Shri Mahakal Lok Corridor', 'Ram Ghat on Kshipra River', 'Kal Bhairav Temple'],
            famousFoods: ['Ujjaini Poha & Jalebi', 'Rabri Malpua', 'Dal Bafla']
          }
        ]
      }
    ]
  },
  {
    name: 'France',
    code: 'FR',
    flag: '🇫🇷',
    states: [
      {
        name: 'Île-de-France',
        cities: [
          {
            name: 'Paris',
            latitude: 48.8566,
            longitude: 2.3522,
            tagline: 'City of Light, Gothic Architecture & World Art',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_mai_2014_%282%29.jpg/1200px-La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_mai_2014_%282%29.jpg',
            topLandmarks: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Arc de Triomphe', 'Sacré-Cœur'],
            famousFoods: ['Croissant & Baguette', 'Escargot', 'Macarons', 'French Onion Soup']
          }
        ]
      }
    ]
  },
  {
    name: 'Italy',
    code: 'IT',
    flag: '🇮🇹',
    states: [
      {
        name: 'Lazio',
        cities: [
          {
            name: 'Rome',
            latitude: 41.9028,
            longitude: 12.4964,
            tagline: 'The Eternal City & Capital of the Roman Empire',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/1200px-Colosseo_2020.jpg',
            topLandmarks: ['The Colosseum', 'Vatican City & St. Peter\'s', 'Trevi Fountain', 'Pantheon', 'Roman Forum'],
            famousFoods: ['Carbonara Pasta', 'Cacio e Pepe', 'Authentic Gelato', 'Roman Pizza']
          }
        ]
      }
    ]
  },
  {
    name: 'Japan',
    code: 'JP',
    flag: '🇯🇵',
    states: [
      {
        name: 'Kansai',
        cities: [
          {
            name: 'Kyoto',
            latitude: 35.0116,
            longitude: 135.7681,
            tagline: 'Ancient Imperial Capital of Shrines & Zen Temples',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Fushimi_Inari_Taisha_torii_path.jpg/1200px-Fushimi_Inari_Taisha_torii_path.jpg',
            topLandmarks: ['Fushimi Inari-taisha Torii Gates', 'Kinkaku-ji (Golden Pavilion)', 'Kiyomizu-dera', 'Arashiyama Bamboo Grove'],
            famousFoods: ['Kyoto Kaiseki Cuisine', 'Matcha Sweets & Green Tea', 'Yudofu (Tofu hot pot)']
          }
        ]
      },
      {
        name: 'Kanto',
        cities: [
          {
            name: 'Tokyo',
            latitude: 35.6762,
            longitude: 139.6503,
            tagline: 'Metropolis of Ultra-Modern Skyline & Ancient Shinto Shrines',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg/1200px-Skyscrapers_of_Shinjuku_2009_January.jpg',
            topLandmarks: ['Senso-ji Temple', 'Shibuya Crossing', 'Tokyo Skytree', 'Meiji Jingu Shrine'],
            famousFoods: ['Edomae Sushi', 'Tonkotsu Ramen', 'Tempura', 'Wagyu Beef']
          }
        ]
      }
    ]
  },
  {
    name: 'United Arab Emirates',
    code: 'AE',
    flag: '🇦🇪',
    states: [
      {
        name: 'Dubai Emirate',
        cities: [
          {
            name: 'Dubai',
            latitude: 25.2048,
            longitude: 55.2708,
            tagline: 'City of Gold, Futuristic Towers & Arabian Luxury',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Dubai_Skyline_from_Burj_Khalifa.jpg/1200px-Dubai_Skyline_from_Burj_Khalifa.jpg',
            topLandmarks: ['Burj Khalifa (Tallest Tower)', 'The Dubai Mall & Fountains', 'Palm Jumeirah', 'Dubai Frame'],
            famousFoods: ['Al Harees', 'Shawarma', 'Luqaimat with Date Syrup', 'Karak Chai']
          }
        ]
      }
    ]
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    flag: '🇬🇧',
    states: [
      {
        name: 'Greater London',
        cities: [
          {
            name: 'London',
            latitude: 51.5074,
            longitude: -0.1278,
            tagline: 'Historic Royal Capital on the Thames',
            photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Palace_of_Westminster_from_the_dome_on_Methodist_Central_Hall.jpg/1200px-Palace_of_Westminster_from_the_dome_on_Methodist_Central_Hall.jpg',
            topLandmarks: ['Big Ben & Parliament', 'Tower of London & Tower Bridge', 'British Museum', 'Buckingham Palace'],
            famousFoods: ['Fish and Chips', 'Traditional Afternoon Tea', 'Sunday Roast with Yorkshire Pudding']
          }
        ]
      }
    ]
  }
];
