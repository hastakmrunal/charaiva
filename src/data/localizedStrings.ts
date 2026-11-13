import { useEffect, useMemo, useRef, useState } from 'react';
import { Language } from '../types';

/**
 * Natural 20-language voice sample greetings in authentic native scripts.
 */
export const NATIVE_VOICE_SAMPLES: Record<string, string> = {
  en: 'Hello! I am Charaiva, your personal AI tourist guide. Point your camera at any monument or local sight to discover its hidden stories.',
  hi: 'नमस्ते! मैं चरैवा हूँ, आपकी व्यक्तिगत एआई पर्यटक मार्गदर्शक। किसी भी स्मारक या स्थान की अनकही कहानियाँ जानने के लिए अपना कैमरा दिखाएँ।',
  es: '¡Hola! Soy Charaiva, tu guía turística personal con inteligencia artificial. Apunta tu cámara a cualquier monumento para descubrir su historia.',
  fr: 'Bonjour ! Je suis Charaiva, votre guide touristique personnelle. Pointez votre caméra vers n’importe quel monument pour découvrir son histoire.',
  de: 'Hallo! Ich bin Charaiva, Ihre persönliche KI-Reiseführerin. Richten Sie Ihre Kamera auf ein Denkmal, um seine faszinierende Geschichte zu entdecken.',
  ja: 'こんにちは！私はあなたのAI観光ガイド、チャライヴァです。カメラを歴史的建造物に向けると、隠された物語をお話しします。',
  zh: '你好！我是你的个人AI旅游向导 Charaiva。将相机对准任何古迹或景点，我来为你讲述背后的故事。',
  ta: 'வணக்கம்! நான் சரைவா, உங்கள் தனிப்பட்ட AI சுற்றுலா வழிகாட்டி. எந்த நினைவுச்சின்னத்தையும் கேமராவில் காட்டி அதன் வரலாற்றைக் கேளுங்கள்.',
  bn: 'নমস্কার! আমি চরৈবা, আপনার ব্যক্তিগত এআই পর্যটন গাইড। যেকোনো ঐতিহাসিক স্থানের গল্প জানতে আপনার ক্যামেরা ধরুন।',
  mr: 'नमस्कार! मी चरैवा, तुमची वैयक्तिक एआय पर्यटन मार्गदर्शक। कोणत्याही ऐतिहासिक स्थळाची गोष्ट ऐकण्यासाठी कॅमेरा समोर धरा।',
  te: 'నమస్కారం! నేను చరైవా, మీ వ్యక్తిగత AI టూరిస్ట్ గైడ్‌ని. ఏదైనా కట్టడం లేదా ప్రదేశం కథలు తెలుసుకోవడానికి కెమెరాను చూపించండి.',
  gu: 'નમસ્તે! હું ચરૈવા છું, તમારી અંગત એઆઈ પ્રવાસ માર્ગદર્શક. કોઈ પણ સ્મારકની રોચક વાર્તાઓ જાણવા તમારો કેમેરા ધરો.',
  kn: 'ನಮಸ್ಕಾರ! ನಾನು ಚರೈವಾ, ನಿಮ್ಮ ವೈಯಕ್ತಿಕ AI ಪ್ರವಾಸಿ ಮಾರ್ಗದರ್ಶಿ. ಯಾವುದೇ ಸ್ಮಾರಕದ ಕಥೆಯನ್ನು ಕೇಳಲು ನಿಮ್ಮ ಕ್ಯಾಮೆರಾವನ್ನು ತೋರಿಸಿ.',
  ar: 'مرحباً! أنا شارايفا، مرشدتك السياحية الذكية الشخصية. وجّه الكاميرا نحو أي معلم أثري لاكتشاف قصته وتاريخه.',
  it: 'Ciao! Sono Charaiva, la tua guida turistica personale con intelligenza artificiale. Inquadra qualsiasi monumento per scoprirne la storia.',
  pt: 'Olá! Eu sou a Charaiva, sua guia turística pessoal com inteligência artificial. Aponte a câmera para qualquer monumento e descubra sua história.',
  ru: 'Здравствуйте! Я Чарава, ваш персональный ИИ-гид. Наведите камеру на любую достопримечательность, чтобы услышать её историю.',
  ko: '안녕하세요! 저는 당신의 개인 AI 여행 가이드 차라이바입니다. 카메라를 명소에 비추시면 흥미로운 역사와 이야기를 들려드릴게요.',
  tr: 'Merhaba! Ben kişisel yapay zekâ turist rehberiniz Charaiva. Herhangi bir anıtın gizli hikâyesini dinlemek için kameranızı doğrultun.',
  vi: 'Xin chào! Tôi là Charaiva, hướng dẫn viên du lịch AI cá nhân của bạn. Hãy hướng máy ảnh vào bất kỳ di tích nào để nghe câu chuyện lịch sử.',
};

const LANDMARK_GREETINGS: Record<string, (title: string) => string> = {
  en: (t) => `Hello! I'm guiding you around ${t}. Ask me anything about its history, architecture, legends, or best photo spots.`,
  hi: (t) => `नमस्ते! मैं ${t} के बारे में आपका मार्गदर्शन कर रही हूँ। इसके इतिहास, वास्तुकला, लोककथाओं या बेहतरीन फ़ोटो स्थानों के बारे में मुझसे कुछ भी पूछें।`,
  es: (t) => `¡Hola! Te estoy guiando por ${t}. Pregúntame lo que quieras sobre su historia, arquitectura, leyendas o los mejores lugares para fotografiar.`,
  fr: (t) => `Bonjour ! Je vous guide à travers ${t}. Posez-moi toutes vos questions sur son histoire, son architecture, ses légendes ou les meilleurs points de vue.`,
  de: (t) => `Hallo! Ich führe Sie rund um ${t}. Fragen Sie mich alles über die Geschichte, Architektur, Legenden oder die besten Fotospots.`,
  ja: (t) => `こんにちは！${t}をご案内しています。歴史や建築、伝説、おすすめの撮影スポットなど、何でもお尋ねください。`,
  zh: (t) => `你好！我正在为你讲解${t}。关于它的历史、建筑、传说或最佳拍照角度，欢迎随时向我提问。`,
  ta: (t) => `வணக்கம்! ${t} குறித்து நான் உங்களுக்கு வழிகாட்டுகிறேன். இதன் வரலாறு, கட்டிடக்கலை, புராணக் கதைகள் அல்லது சிறந்த புகைப்பட இடங்களைப் பற்றி எதுவும் கேளுங்கள்.`,
  bn: (t) => `নমস্কার! আমি আপনাকে ${t} সম্পর্কে গাইড করছি। এর ইতিহাস, স্থাপত্য, কিংবদন্তি বা ছবির সেরা জায়গা নিয়ে যেকোনো প্রশ্ন করুন।`,
  mr: (t) => `नमस्कार! मी तुम्हाला ${t} बद्दल मार्गदर्शन करत आहे. त्याचा इतिहास, स्थापत्यकला, दंतकथा किंवा सर्वोत्तम छायाचित्रण ठिकाणांबद्दल काहीही विचारा.`,
  te: (t) => `నమస్కారం! నేను మీకు ${t} గురించి గైడ్ చేస్తున్నాను. దీని చరిత్ర, వాస్తుశిల్పం, కథలు లేదా ఫోటో ప్రదేశాల గురించి ఏదైనా అడగండి.`,
  gu: (t) => `નમસ્તે! હું તમને ${t} વિશે માર્ગદર્શન આપી રહી છું. તેના ઇતિહાસ, સ્થાપત્ય, લોકકથાઓ કે ફોટોગ્રાફીના સ્થળો વિશે કંઈ પણ પૂછો.`,
  kn: (t) => `ನಮಸ್ಕಾರ! ನಾನು ನಿಮಗೆ ${t} ಬಗ್ಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತಿದ್ದೇನೆ. ಇದರ ಇತಿಹಾಸ, ವಾಸ್ತುಶಿಲ್ಪ, ದಂತಕಥೆಗಳು ಅಥವಾ ಅತ್ಯುತ್ತಮ ಫೋಟೋ ಸ್ಥಳಗಳ ಬಗ್ಗೆ ಏನನ್ನಾದರೂ ಕೇಳಿ.`,
  ar: (t) => `مرحباً! أنا أرشدك حول ${t}. اسألني عن أي شيء يخص تاريخه أو هندسته المعمارية أو أساطيره أو أفضل أماكن التصوير.`,
  it: (t) => `Ciao! Ti sto guidando alla scoperta di ${t}. Chiedimi qualsiasi cosa sulla sua storia, architettura, leggende o i punti migliori per le foto.`,
  pt: (t) => `Olá! Estou guiando você por ${t}. Pergunte-me qualquer coisa sobre sua história, arquitetura, lendas ou melhores pontos para fotos.`,
  ru: (t) => `Здравствуйте! Я ваш гид по ${t}. Спрашивайте меня о его истории, архитектуре, легендах или лучших местах для фото.`,
  ko: (t) => `안녕하세요! 지금 ${t}에 대해 안내해 드리고 있어요. 역사, 건축, 전설 또는 사진 명소 등 궁금한 점을 무엇이든 물어보세요.`,
  tr: (t) => `Merhaba! Size ${t} hakkında rehberlik ediyorum. Tarihi, mimarisi, efsaneleri veya en iyi fotoğraf noktaları hakkında dilediğinizi sorabilirsiniz.`,
  vi: (t) => `Xin chào! Tôi đang hướng dẫn bạn khám phá ${t}. Hãy hỏi tôi bất cứ điều gì về lịch sử, kiến trúc, truyền thuyết hay góc chụp ảnh đẹp.`,
};

const GENERAL_GREETINGS: Record<string, string> = {
  en: 'Hello! I am your Charaiva AI personal tour guide. Where are we exploring today? Ask me about nearby historical sights, traditions, or secret travel gems.',
  hi: 'नमस्ते! मैं चरैवा हूँ, आपकी व्यक्तिगत एआई पर्यटक मार्गदर्शक। आज हम कहाँ घूम रहे हैं? पास के ऐतिहासिक स्थलों, परंपराओं या अनजाने दर्शनीय स्थानों के बारे में पूछें।',
  es: '¡Hola! Soy Charaiva, tu guía turística personal con IA. ¿Qué exploramos hoy? Pregúntame sobre sitios históricos cercanos, tradiciones o joyas ocultas.',
  fr: 'Bonjour ! Je suis Charaiva, votre guide touristique personnelle par IA. Qu’explorons-nous aujourd’hui ? Demandez-moi des lieux historiques, des traditions ou des trésors cachés.',
  de: 'Hallo! Ich bin Charaiva, Ihre persönliche KI-Reiseführerin. Was erkunden wir heute? Fragen Sie nach historischen Orten, Traditionen oder Geheimtipps.',
  ja: 'こんにちは！AIパーソナル観光ガイドのチャライヴァです。今日はどこを旅しますか？近くの歴史的名所や伝統、穴場スポットについて何でも聞いてください。',
  zh: '你好！我是你的 Charaiva AI 私人导游。今天我们去哪里探索？欢迎询问附近的历史古迹、传统文化或小众秘境。',
  ta: 'வணக்கம்! நான் உங்கள் சரைவா AI தனிப்பட்ட சுற்றுலா வழிகாட்டி. இன்று நாம் எங்கே சுற்றிப் பார்க்கிறோம்? அருகிலுள்ள வரலாற்று இடங்கள், மரபுகள் அல்லது ரகசிய இடங்களைப் பற்றி கேளுங்கள்.',
  bn: 'নমস্কার! আমি আপনার চরৈবা এআই ব্যক্তিগত ট্যুর গাইড। আজ আমরা কোথায় ঘুরছি? কাছাকাছি ঐতিহাসিক স্থান, ঐতিহ্য বা গোপন দর্শনীয় স্থান সম্পর্কে জিজ্ঞাসা করুন।',
  mr: 'नमस्कार! मी तुमची चरैवा एआय वैयक्तिक पर्यटन मार्गदर्शक आहे. आज आपण कुठे भटकंती करत आहोत? जवळपासची ऐतिहासिक ठिकाणे, परंपरा किंवा लपलेल्या रत्नांबद्दल विचारा.',
  te: 'నమస్కారం! నేను మీ చరైవా AI వ్యక్తిగత టూర్ గైడ్‌ని. ఈ రోజు మనం ఎక్కడ అన్వేషిస్తున్నాము? సమీపంలోని చారిత్రక ప్రదేశాలు, సంప్రదాయాలు లేదా రహస్య స్థలాల గురించి అడగండి.',
  gu: 'નમસ્તે! હું તમારી ચરૈવા AI અંગત પ્રવાસ માર્ગદર્શક છું. આજે આપણે ક્યાં ફરી રહ્યા છીએ? નજીકના ઐતિહાસિક સ્થળો, પરંપરાઓ કે છુપાયેલા સ્થળો વિશે પૂછો.',
  kn: 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಚರೈವಾ AI ವೈಯಕ್ತಿಕ ಪ್ರವಾಸಿ ಮಾರ್ಗದರ್ಶಿ. ಇಂದು ನಾವು ಎಲ್ಲಿ ಅನ್ವೇಷಿಸುತ್ತಿದ್ದೇವೆ? ಹತ್ತಿರದ ಐತಿಹಾಸಿಕ ಸ್ಥಳಗಳು, ಸಂಪ್ರದಾಯಗಳು ಅಥವಾ ಗುಪ್ತ ತಾಣಗಳ ಬಗ್ಗೆ ಕೇಳಿ.',
  ar: 'مرحباً! أنا شارايفا، مرشدتك السياحية الذكية الشخصية. أين نستكشف اليوم؟ اسألني عن المعالم التاريخية القريبة أو التقاليد أو الجواهر الخفية.',
  it: 'Ciao! Sono Charaiva, la tua guida turistica personale con IA. Cosa esploriamo oggi? Chiedimi notizie su siti storici vicini, tradizioni o gemme nascoste.',
  pt: 'Olá! Sou a Charaiva, sua guia turística pessoal com IA. O que vamos explorar hoje? Pergunte sobre pontos históricos próximos, tradições ou joias escondidas.',
  ru: 'Здравствуйте! Я Чарава, ваш персональный ИИ-гид. Что мы исследуем сегодня? Спрашивайте о ближайших исторических местах, традициях и скрытых жемчужинах.',
  ko: '안녕하세요! 저는 개인 AI 여행 가이드 차라이바입니다. 오늘 어디를 여행하시나요? 주변 명소, 전통, 숨은 보석 같은 장소에 대해 물어보세요.',
  tr: 'Merhaba! Kişisel yapay zekâ turist rehberiniz Charaiva. Bugün nereyi keşfediyoruz? Yakındaki tarihi yerler, gelenekler veya gizli noktalar hakkında soru sorabilirsiniz.',
  vi: 'Xin chào! Tôi là Charaiva, hướng dẫn viên du lịch AI cá nhân của bạn. Hôm nay chúng ta khám phá đâu? Hãy hỏi về di tích, truyền thống hay điểm đến bí mật gần bạn.',
};

export function getLocalizedChatGreeting(language: Language, landmarkTitle?: string): string {
  const code = language.code || 'en';
  if (landmarkTitle && landmarkTitle.trim().length > 0) {
    const fn = LANDMARK_GREETINGS[code] || LANDMARK_GREETINGS.en;
    return fn(landmarkTitle);
  }
  return GENERAL_GREETINGS[code] || GENERAL_GREETINGS.en;
}

const DISTANCE_UNIT_BY_CODE: Record<string, string> = {
  en: 'kilometers',
  hi: 'किलोमीटर',
  es: 'kilómetros',
  fr: 'kilomètres',
  de: 'Kilometer',
  ja: 'キロメートル',
  zh: '公里',
  ta: 'கிலோமீட்டர்',
  bn: 'কিলোমিটার',
  mr: 'किलोमीटर',
  te: 'కిలోమీటర్లు',
  gu: 'કિલોમીટર',
  kn: 'ಕಿಲೋಮೀಟರ್',
  ar: 'كيلومترات',
  it: 'chilometri',
  pt: 'quilômetros',
  ru: 'километров',
  ko: '킬로미터',
  tr: 'kilometre',
  vi: 'kilômét',
};

const CITY_SPEECH_LABELS: Record<
  string,
  { history: string; architecture: string; cuisine: string; highlights: string; foods: string; bestTime: string }
> = {
  en: { history: 'History and founding', architecture: 'Architectural heritage', cuisine: 'Culinary trail', highlights: 'Highlights', foods: 'Iconic foods', bestTime: 'Best time to visit' },
  hi: { history: 'इतिहास और स्थापना', architecture: 'स्थापत्य विरासत', cuisine: 'पाक परंपरा', highlights: 'प्रमुख आकर्षण', foods: 'प्रसिद्ध व्यंजन', bestTime: 'घूमने का सर्वोत्तम समय' },
  es: { history: 'Historia y fundación', architecture: 'Patrimonio arquitectónico', cuisine: 'Ruta gastronómica', highlights: 'Destacados', foods: 'Platos icónicos', bestTime: 'Mejor época para visitar' },
  fr: { history: 'Histoire et fondation', architecture: 'Patrimoine architectural', cuisine: 'Parcours culinaire', highlights: 'Incontournables', foods: 'Spécialités locales', bestTime: 'Meilleure période' },
  de: { history: 'Geschichte und Gründung', architecture: 'Architektonisches Erbe', cuisine: 'Kulinarik', highlights: 'Höhepunkte', foods: 'Berühmte Speisen', bestTime: 'Beste Reisezeit' },
  ja: { history: '歴史と成り立ち', architecture: '建築遺産', cuisine: 'グルメ案内', highlights: '見どころ', foods: '名物料理', bestTime: 'ベストシーズン' },
  zh: { history: '历史与起源', architecture: '建筑遗产', cuisine: '美食探索', highlights: '主要亮点', foods: '特色美食', bestTime: '最佳游览时间' },
  ta: { history: 'வரலாறு மற்றும் தோற்றம்', architecture: 'கட்டிடக்கலை பாரம்பரியம்', cuisine: 'உணவுப் பாரம்பரியம்', highlights: 'சிறப்பம்சங்கள்', foods: 'பிரபல உணவுகள்', bestTime: 'பார்வையிட சிறந்த நேரம்' },
  bn: { history: 'ইতিহাস ও প্রতিষ্ঠা', architecture: 'স্থাপত্য ঐতিহ্য', cuisine: 'খাবারের ঐতিহ্য', highlights: 'মূল আকর্ষণ', foods: 'বিখ্যাত খাবার', bestTime: 'ভ্রমণের সেরা সময়' },
  mr: { history: 'इतिहास आणि स्थापना', architecture: 'स्थापत्य वारसा', cuisine: 'खाद्यसंस्कृती', highlights: 'मुख्य आकर्षणे', foods: 'प्रसिद्ध पदार्थ', bestTime: 'भेट देण्याची सर्वोत्तम वेळ' },
  te: { history: 'చరిత్ర మరియు స్థాపన', architecture: 'వాస్తు వారసత్వం', cuisine: 'ఆహార విశేషాలు', highlights: 'ప్రధాన విశేషాలు', foods: 'ప్రసిద్ధ వంటకాలు', bestTime: 'సందర్శించడానికి ఉత్తమ సమయం' },
  gu: { history: 'ઇતિહાસ અને સ્થાપના', architecture: 'સ્થાપત્ય વારસો', cuisine: 'ખાણીપીણીની ઓળખ', highlights: 'મુખ્ય આકર્ષણો', foods: 'પ્રખ્યાત વાનગીઓ', bestTime: 'મુલાકાતનો શ્રેષ્ઠ સમય' },
  kn: { history: 'ಇತಿಹಾಸ ಮತ್ತು ಸ್ಥಾಪನೆ', architecture: 'ವಾಸ್ತುಶಿಲ್ಪ ಪರಂಪರೆ', cuisine: 'ಆಹಾರ ಸಂಸ್ಕೃತಿ', highlights: 'ಪ್ರಮುಖ ಆಕರ್ಷಣೆಗಳು', foods: 'ಪ್ರಸಿದ್ಧ ಖಾದ್ಯಗಳು', bestTime: 'ಭೇಟಿ ನೀಡಲು ಉತ್ತಮ ಸಮಯ' },
  ar: { history: 'التاريخ والتأسيس', architecture: 'التراث المعماري', cuisine: 'المطبخ المحلي', highlights: 'أبرز المعالم', foods: 'الأطباق الشهيرة', bestTime: 'أفضل وقت للزيارة' },
  it: { history: 'Storia e fondazione', architecture: 'Patrimonio architettonico', cuisine: 'Percorso culinario', highlights: 'Punti salienti', foods: 'Piatti tipici', bestTime: 'Periodo migliore' },
  pt: { history: 'História e fundação', architecture: 'Patrimônio arquitetônico', cuisine: 'Rota gastronômica', highlights: 'Destaques', foods: 'Pratos típicos', bestTime: 'Melhor época para visitar' },
  ru: { history: 'История и основание', architecture: 'Архитектурное наследие', cuisine: 'Гастрономия', highlights: 'Главное', foods: 'Знаменитые блюда', bestTime: 'Лучшее время для визита' },
  ko: { history: '역사와 기원', architecture: '건축 유산', cuisine: '미식 탐방', highlights: '주요 명소', foods: '대표 음식', bestTime: '방문하기 좋은 시기' },
  tr: { history: 'Tarihçe ve kuruluş', architecture: 'Mimari miras', cuisine: 'Mutfak kültürü', highlights: 'Öne çıkanlar', foods: 'Meşhur lezzetler', bestTime: 'En iyi ziyaret zamanı' },
  vi: { history: 'Lịch sử và hình thành', architecture: 'Di sản kiến trúc', cuisine: 'Hành trình ẩm thực', highlights: 'Điểm nổi bật', foods: 'Món ăn đặc trưng', bestTime: 'Thời điểm lý tưởng' },
};

export function buildSpotNarrationText(
  spot: {
    name: string;
    localizedName?: string;
    estimatedDistanceKm?: number;
    addressOrLocality?: string;
    oneLineImportance?: string;
    description?: string;
  },
  cityName: string,
  languageCode: string
): string {
  const displayName = spot.localizedName || spot.name;
  const distUnit = DISTANCE_UNIT_BY_CODE[languageCode] || 'km';
  const distPart =
    typeof spot.estimatedDistanceKm === 'number'
      ? `${spot.estimatedDistanceKm} ${distUnit}`
      : '';
  const placePart = [spot.addressOrLocality || cityName, distPart].filter(Boolean).join(', ');
  return [displayName, placePart, spot.oneLineImportance, spot.description]
    .filter((s) => s && s.trim().length > 0)
    .join('. ');
}

export function buildCityGuideSpeechScript(
  cityData: {
    cityName: string;
    moniker?: string;
    briefOverview?: string;
    quickHighlights?: string[];
    famousFoods?: string[];
    bestTimeToVisit?: string;
    inDepthGuide?: {
      foundingAndHistory?: string;
      architecturalHeritage?: string;
      culinaryTrail?: string;
    };
  },
  showFullDepth: boolean,
  languageCode: string
): string {
  const labels = CITY_SPEECH_LABELS[languageCode] || CITY_SPEECH_LABELS.en;
  if (showFullDepth && cityData.inDepthGuide) {
    return [
      `${cityData.cityName}, ${cityData.moniker || ''}`.trim(),
      cityData.briefOverview,
      cityData.inDepthGuide.foundingAndHistory
        ? `${labels.history}: ${cityData.inDepthGuide.foundingAndHistory}`
        : '',
      cityData.inDepthGuide.architecturalHeritage
        ? `${labels.architecture}: ${cityData.inDepthGuide.architecturalHeritage}`
        : '',
      cityData.inDepthGuide.culinaryTrail
        ? `${labels.cuisine}: ${cityData.inDepthGuide.culinaryTrail}`
        : '',
    ]
      .filter(Boolean)
      .join('. ');
  }

  return [
    `${cityData.cityName}, ${cityData.moniker || ''}`.trim(),
    cityData.briefOverview,
    cityData.quickHighlights?.length
      ? `${labels.highlights}: ${cityData.quickHighlights.slice(0, 3).join(', ')}`
      : '',
    cityData.famousFoods?.length
      ? `${labels.foods}: ${cityData.famousFoods.slice(0, 3).join(', ')}`
      : '',
    cityData.bestTimeToVisit ? `${labels.bestTime}: ${cityData.bestTimeToVisit}` : '',
  ]
    .filter(Boolean)
    .join('. ');
}

const STORAGE_PREFIX = 'charaiva_ui_i18n_v1:';
const memoryCache = new Map<string, Record<string, string>>();
const inFlightBatches = new Map<string, Promise<Record<string, string>>>();

function loadLangDictionary(langCode: string): Record<string, string> {
  if (memoryCache.has(langCode)) {
    return memoryCache.get(langCode)!;
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${langCode}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryCache.set(langCode, parsed);
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  const empty: Record<string, string> = {};
  memoryCache.set(langCode, empty);
  return empty;
}

function saveLangDictionaryEntries(langCode: string, entries: Record<string, string>): void {
  const existing = loadLangDictionary(langCode);
  const merged = { ...existing, ...entries };
  memoryCache.set(langCode, merged);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${langCode}`, JSON.stringify(merged));
  } catch {
    // ignore quota errors
  }
}

function resolveFromDictionary<T extends Record<string, string>>(defaults: T, langCode: string): { resolved: T; missingKeys: string[] } {
  if (langCode === 'en') {
    return { resolved: defaults, missingKeys: [] };
  }
  const dict = loadLangDictionary(langCode);
  const resolved = { ...defaults } as Record<string, string>;
  const missingKeys: string[] = [];

  for (const [k, sourceVal] of Object.entries(defaults)) {
    if (!sourceVal || !sourceVal.trim()) continue;
    const hit = dict[sourceVal];
    if (hit && hit.trim().length > 0) {
      resolved[k] = hit;
    } else {
      missingKeys.push(k);
    }
  }
  return { resolved: resolved as T, missingKeys };
}

export async function translateTextBatch(
  entries: Record<string, string>,
  language: Language,
  context: string = 'UI labels and travel guide copy'
): Promise<Record<string, string>> {
  if (!language || language.code === 'en') {
    return entries;
  }

  const dict = loadLangDictionary(language.code);
  const missingEntries: Array<[string, string]> = [];
  const result: Record<string, string> = {};

  for (const [k, srcText] of Object.entries(entries)) {
    if (!srcText || !srcText.trim()) {
      result[k] = srcText;
      continue;
    }
    if (dict[srcText]) {
      result[k] = dict[srcText];
    } else {
      result[k] = srcText;
      missingEntries.push([k, srcText]);
    }
  }

  if (missingEntries.length === 0) {
    return result;
  }

  // Deduplicate unique source strings before querying the server
  const uniqueSources = Array.from(new Set(missingEntries.map(([, v]) => v)));
  const chunkSize = 24;
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueSources.length; i += chunkSize) {
    chunks.push(uniqueSources.slice(i, i + chunkSize));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const payloadMap: Record<string, string> = {};
      chunk.forEach((txt, idx) => {
        payloadMap[`k${idx}`] = txt;
      });
      const cacheFingerprint = `${language.code}::${chunk.join('\u0001')}`;

      let pendingPromise = inFlightBatches.get(cacheFingerprint);
      if (!pendingPromise) {
        pendingPromise = (async () => {
          const res = await fetch('/api/translate-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              texts: payloadMap,
              targetLanguage: language.name,
              context,
            }),
          });
          if (!res.ok) {
            throw new Error(`Translation HTTP ${res.status}`);
          }
          const data = await res.json();
          if (!data.success || !data.translations) {
            throw new Error(data.error || 'Batch translation failed');
          }
          const newDictEntries: Record<string, string> = {};
          chunk.forEach((srcText, idx) => {
            const translated = data.translations[`k${idx}`];
            if (typeof translated === 'string' && translated.trim().length > 0) {
              newDictEntries[srcText] = translated;
            }
          });
          if (Object.keys(newDictEntries).length > 0) {
            saveLangDictionaryEntries(language.code, newDictEntries);
          }
          return newDictEntries;
        })().finally(() => {
          inFlightBatches.delete(cacheFingerprint);
        });
        inFlightBatches.set(cacheFingerprint, pendingPromise);
      }

      try {
        await pendingPromise;
      } catch (err) {
        console.warn('Batch translation skipped/failed:', err);
      }
    })
  );

  const updatedDict = loadLangDictionary(language.code);
  for (const [k, srcText] of Object.entries(entries)) {
    if (srcText && updatedDict[srcText]) {
      result[k] = updatedDict[srcText];
    }
  }
  return result;
}

/**
 * React hook that reactively translates an English defaults object into the selected Language
 * using instant localStorage + memory caching and deduplicated `/api/translate-batch` calls.
 */
export function useLocalizedTexts<T extends Record<string, string>>(
  defaults: T,
  language: Language,
  context: string = 'UI interface copy'
): { t: T; isTranslating: boolean } {
  const defaultsRef = useRef<T>(defaults);
  defaultsRef.current = defaults;

  const signature = useMemo(() => JSON.stringify(defaults), [defaults]);

  const [{ t, isTranslating }, setState] = useState<{ t: T; isTranslating: boolean }>(() => {
    const { resolved, missingKeys } = resolveFromDictionary(defaults, language.code);
    return { t: resolved, isTranslating: language.code !== 'en' && missingKeys.length > 0 };
  });

  useEffect(() => {
    const currentDefaults = defaultsRef.current;
    if (language.code === 'en') {
      setState({ t: currentDefaults, isTranslating: false });
      return;
    }

    const { resolved, missingKeys } = resolveFromDictionary(currentDefaults, language.code);
    if (missingKeys.length === 0) {
      setState({ t: resolved, isTranslating: false });
      return;
    }

    let cancelled = false;
    setState({ t: resolved, isTranslating: true });

    const missingPayload: Record<string, string> = {};
    for (const k of missingKeys) {
      missingPayload[k] = currentDefaults[k];
    }

    translateTextBatch(missingPayload, language, context).then(() => {
      if (cancelled) return;
      const refreshed = resolveFromDictionary(defaultsRef.current, language.code);
      setState({ t: refreshed.resolved, isTranslating: false });
    });

    return () => {
      cancelled = true;
    };
  }, [language.code, language.name, signature, context]);

  return { t, isTranslating };
}
