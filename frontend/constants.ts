import { PropertyHouse, PricingRule } from './types';

export const INITIAL_HOUSES: PropertyHouse[] = [
  {
    id: "house-1",
    nickname: "House 1 (1114 Florida Ave NE)",
    title: "Historic Florida Ave Rowhome - 3BR Modern Brownstone",
    address: "1114 Florida Ave NE, Washington, DC 20002",
    neighborhood: "H Street Corridor / Near Northeast, Washington, DC",
    zipCode: "20002",
    bedrooms: 3,
    bathrooms: 2.5,
    currentPrice: 285, // Current rate
    floorPrice: 195, // Safety floor
    cleaningFee: 145,
    unbookedDaysCount: 5, // The 5 empty days
    unbookedStartDate: "2025-04-16",
    unbookedEndDate: "2025-04-21",
    isBooked: false,
    propertyManagerName: "Carlos R. (Lead PM)",
    managerPhone: "+1 (202) 555-0189",
    activePromotion: null,
    comps: [
      {
        id: "comp-dc-1",
        name: "Direct Neighbor: 1108 Florida Ave NE Rowhome",
        address: "1108 Florida Ave NE (3 doors down)",
        airbnbUrl: "https://airbnb.com/rooms/1108florida",
        bedrooms: 3,
        bathrooms: 2,
        rating: 4.93,
        reviewsCount: 118,
        currentPrice: 215, // Neighbor dropped to 215!
        originalPrice: 270,
        isBooked: false,
        distanceMiles: 0.02,
        superhost: true,
        priceHistory: [
          { date: "4 days ago", price: 270 },
          { date: "2 days ago", price: 240 },
          { date: "Today", price: 215 }
        ]
      },
      {
        id: "comp-dc-2",
        name: "1206 Orren St NE Designer 3BR Suite",
        address: "1206 Orren St NE (1 block away)",
        airbnbUrl: "https://airbnb.com/rooms/1206orren",
        bedrooms: 3,
        bathrooms: 2.5,
        rating: 4.88,
        reviewsCount: 76,
        currentPrice: 225,
        originalPrice: 260,
        isBooked: false,
        distanceMiles: 0.1,
        superhost: false,
        priceHistory: [
          { date: "4 days ago", price: 260 },
          { date: "2 days ago", price: 235 },
          { date: "Today", price: 225 }
        ]
      },
      {
        id: "comp-dc-3",
        name: "1310 H St NE Luxury Balcony Suite",
        address: "1310 H St NE (Dining corridor)",
        airbnbUrl: "https://airbnb.com/rooms/1310hstreet",
        bedrooms: 3,
        bathrooms: 2,
        rating: 4.96,
        reviewsCount: 224,
        currentPrice: 310,
        originalPrice: 310,
        isBooked: true, // Booked!
        distanceMiles: 0.3,
        superhost: true,
        priceHistory: [
          { date: "4 days ago", price: 310 },
          { date: "Today", price: 310 }
        ]
      },
      {
        id: "comp-dc-4",
        name: "1022 Montello Ave NE Charming 3-Bed",
        address: "1022 Montello Ave NE",
        airbnbUrl: "https://airbnb.com/rooms/1022montello",
        bedrooms: 3,
        bathrooms: 2,
        rating: 4.81,
        reviewsCount: 44,
        currentPrice: 210,
        originalPrice: 250,
        isBooked: false,
        distanceMiles: 0.2,
        superhost: false,
        priceHistory: [
          { date: "4 days ago", price: 250 },
          { date: "Today", price: 210 }
        ]
      }
    ]
  },
  {
    id: "house-2",
    nickname: "House 2 (Capitol Hill North)",
    title: "Historic Victorian Flat by Eastern Market & Capitol",
    address: "418 8th St NE, Washington, DC 20002",
    neighborhood: "Capitol Hill / Near Eastern Market",
    zipCode: "20002",
    bedrooms: 2,
    bathrooms: 2,
    currentPrice: 265,
    floorPrice: 180,
    cleaningFee: 125,
    unbookedDaysCount: 3, // 3 empty days
    unbookedStartDate: "2025-04-22",
    unbookedEndDate: "2025-04-25",
    isBooked: false,
    propertyManagerName: "Carlos R. (Lead PM)",
    managerPhone: "+1 (202) 555-0189",
    activePromotion: null,
    comps: [
      {
        id: "comp-dc-2-1",
        name: "Neighbor 412 8th St NE Garden 2BR",
        address: "412 8th St NE (Same block)",
        airbnbUrl: "https://airbnb.com/rooms/4128thst",
        bedrooms: 2,
        bathrooms: 2,
        rating: 4.92,
        reviewsCount: 139,
        currentPrice: 215,
        originalPrice: 255,
        isBooked: false,
        distanceMiles: 0.03,
        superhost: true,
        priceHistory: [
          { date: "3 days ago", price: 255 },
          { date: "Today", price: 215 }
        ]
      },
      {
        id: "comp-dc-2-2",
        name: "710 Constitution Ave NE Brownstone",
        address: "710 Constitution Ave NE",
        airbnbUrl: "https://airbnb.com/rooms/710const",
        bedrooms: 2,
        bathrooms: 1.5,
        rating: 4.89,
        reviewsCount: 92,
        currentPrice: 230,
        originalPrice: 245,
        isBooked: false,
        distanceMiles: 0.25,
        superhost: false,
        priceHistory: [
          { date: "3 days ago", price: 245 },
          { date: "Today", price: 230 }
        ]
      },
      {
        id: "comp-dc-2-3",
        name: "Union Station Historic Carriage House",
        address: "215 F St NE",
        airbnbUrl: "https://airbnb.com/rooms/215fst",
        bedrooms: 2,
        bathrooms: 2,
        rating: 4.97,
        reviewsCount: 180,
        currentPrice: 280,
        originalPrice: 280,
        isBooked: true,
        distanceMiles: 0.45,
        superhost: true,
        priceHistory: [
          { date: "3 days ago", price: 280 },
          { date: "Today", price: 280 }
        ]
      }
    ]
  }
];

export const INITIAL_RULES: PricingRule[] = [
  {
    id: "rule-1",
    title: "5-Day Orphan Gap Emergency Rule",
    enabled: true,
    description: "Trigger immediate action if 3-5 consecutive days are vacant within the next 7 days.",
    parameterName: "Empty Window Limit",
    parameterValue: 5,
    unit: "days"
  },
  {
    id: "rule-2",
    title: "Direct Neighbor Undercut Threshold",
    enabled: true,
    description: "Alert host if adjacent Florida Ave neighbor price is >8% lower than your listing.",
    parameterName: "Neighbor Undercut",
    parameterValue: 8,
    unit: "%"
  },
  {
    id: "rule-3",
    title: "Official Airbnb Promotion Badge",
    enabled: true,
    description: "Recommend 15% Last Minute or 20% Length of Stay badge to boost search algorithm ranking.",
    parameterName: "Promo Discount",
    parameterValue: 15,
    unit: "%"
  },
  {
    id: "rule-4",
    title: "Host Safety Floor Rate",
    enabled: true,
    description: "Strict floor to prevent underpricing below operational cleaning/mortgage costs.",
    parameterName: "Floor Price",
    parameterValue: 195,
    unit: "$/night"
  }
];
