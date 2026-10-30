import type { SupportedCountry } from "@/lib/phone";

export type SubdivisionConfig = {
  label: string;
  options: readonly string[];
};

export const COUNTRY_SUBDIVISIONS: Record<
  SupportedCountry,
  SubdivisionConfig
> = {
  US: {
    label: "State",
    options: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California",
      "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
      "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
      "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts",
      "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana",
      "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
      "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
      "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
      "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
      "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
      "District of Columbia",
    ],
  },
  PH: {
    label: "Province",
    options: [
      "Abra", "Agusan del Norte", "Agusan del Sur", "Aklan", "Albay",
      "Antique", "Apayao", "Aurora", "Basilan", "Bataan", "Batanes",
      "Batangas", "Benguet", "Biliran", "Bohol", "Bukidnon", "Bulacan",
      "Cagayan", "Camarines Norte", "Camarines Sur", "Camiguin",
      "Capiz", "Catanduanes", "Cavite", "Cebu", "Cotabato", "Davao de Oro",
      "Davao del Norte", "Davao del Sur", "Davao Occidental",
      "Davao Oriental", "Dinagat Islands", "Eastern Samar", "Guimaras",
      "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela",
      "Kalinga", "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur",
      "Leyte", "Maguindanao del Norte", "Maguindanao del Sur", "Marinduque",
      "Masbate", "Misamis Occidental", "Misamis Oriental", "Mountain Province",
      "Negros Occidental", "Negros Oriental", "Northern Samar",
      "Nueva Ecija", "Nueva Vizcaya", "Occidental Mindoro",
      "Oriental Mindoro", "Palawan", "Pampanga", "Pangasinan",
      "Quezon", "Quirino", "Rizal", "Romblon", "Samar", "Sarangani",
      "Siquijor", "Sorsogon", "South Cotabato", "Southern Leyte",
      "Sultan Kudarat", "Sulu", "Surigao del Norte", "Surigao del Sur",
      "Tarlac", "Tawi-Tawi", "Zambales", "Zamboanga del Norte",
      "Zamboanga del Sur", "Zamboanga Sibugay",
    ],
  },
  SG: {
    label: "Region",
    options: ["Central Region", "East Region", "North Region", "North-East Region", "West Region"],
  },
  MY: {
    label: "State",
    options: [
      "Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Melaka",
      "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Putrajaya",
      "Sabah", "Sarawak", "Selangor", "Terengganu",
    ],
  },
  KE: {
    label: "County",
    options: [
      "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu",
      "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
      "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
      "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
      "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
      "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
      "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
      "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir",
      "West Pokot",
    ],
  },
  GH: {
    label: "Region",
    options: [
      "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern",
      "Greater Accra", "North East", "Northern", "Oti", "Savannah",
      "Upper East", "Upper West", "Volta", "Western", "Western North",
    ],
  },
  NG: {
    label: "State",
    options: [
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
      "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
      "Ekiti", "Enugu", "Federal Capital Territory", "Gombe", "Imo",
      "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
      "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
      "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
    ],
  },
  ZA: {
    label: "Province",
    options: [
      "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
      "Limpopo", "Mpumalanga", "Northern Cape", "North West",
      "Western Cape",
    ],
  },
  GB: {
    label: "Country / Region",
    options: ["England", "Scotland", "Wales", "Northern Ireland"],
  },
  CA: {
    label: "Province / Territory",
    options: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick",
      "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
      "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
      "Yukon",
    ],
  },
  IN: {
    label: "State / Union Territory",
    options: [
      "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh",
      "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
      "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat",
      "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
      "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
      "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
      "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
      "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
      "Uttarakhand", "West Bengal",
    ],
  },
  CN: {
    label: "Province / Region",
    options: [
      "Anhui", "Beijing", "Chongqing", "Fujian", "Gansu", "Guangdong",
      "Guangxi", "Guizhou", "Hainan", "Hebei", "Heilongjiang", "Henan",
      "Hong Kong", "Hubei", "Hunan", "Inner Mongolia", "Jiangsu",
      "Jiangxi", "Jilin", "Liaoning", "Macau", "Ningxia", "Qinghai",
      "Shaanxi", "Shandong", "Shanghai", "Shanxi", "Sichuan", "Tianjin",
      "Tibet", "Xinjiang", "Yunnan", "Zhejiang",
    ],
  },
  AE: {
    label: "Emirate",
    options: [
      "Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah",
      "Sharjah", "Umm Al Quwain",
    ],
  },
  BR: {
    label: "State",
    options: [
      "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará",
      "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão",
      "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará",
      "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro",
      "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima",
      "Santa Catarina", "São Paulo", "Sergipe", "Tocantins",
    ],
  },
  VN: {
    label: "Province / Municipality",
    options: [
      "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng", "Đắk Lắk",
      "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Tĩnh",
      "Hưng Yên", "Khánh Hòa", "Lai Châu", "Lạng Sơn", "Lào Cai",
      "Lâm Đồng", "Nghệ An", "Ninh Bình", "Phú Thọ", "Quảng Ngãi",
      "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh", "Thái Nguyên",
      "Thanh Hóa", "Thừa Thiên Huế", "Tuyên Quang", "Vĩnh Long",
      "Đà Nẵng", "Hải Phòng", "Hà Nội", "Hồ Chí Minh", "Cần Thơ",
    ],
  },
  TR: {
    label: "Province",
    options: [
      "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya",
      "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir",
      "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis",
      "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
      "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
      "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane",
      "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
      "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu",
      "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis",
      "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin",
      "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu",
      "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt",
      "Sinop", "Şırnak", "Sivas", "Tekirdağ", "Tokat", "Trabzon",
      "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
    ],
  },
};

export function getSubdivisionConfig(countryCode: SupportedCountry) {
  return COUNTRY_SUBDIVISIONS[countryCode];
}

export function isValidSubdivision(
  countryCode: SupportedCountry,
  value: string,
): boolean {
  return COUNTRY_SUBDIVISIONS[countryCode].options.includes(value);
}
