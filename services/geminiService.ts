import { PlaceRecommendation } from "../types";

// Danh sách danh mục mở rộng
export const PLACE_CATEGORIES = [
    { id: "Cafe lãng mạn", label: "Cafe Đẹp", icon: "☕" },
    { id: "Nhà hàng view đẹp", label: "Ăn Tối", icon: "🍽️" },
    { id: "Rạp chiếu phim", label: "Xem Phim", icon: "🎬" },
    { id: "Trung tâm thương mại", label: "Mua Sắm", icon: "🛍️" },
    { id: "Công viên hồ nước", label: "Dạo Mát", icon: "🌳" },
    { id: "Khách sạn tình yêu", label: "Riêng Tư", icon: "hotel" }, // Icon xử lý bên UI
    { id: "Glamping cắm trại", label: "Cắm Trại", icon: "⛺" },
    { id: "Workshop làm gốm vẽ tranh", label: "Workshop", icon: "🎨" },
    { id: "Quán Pub Acoustic", label: "Nhạc Live", icon: "🎸" },
    { id: "Billiards Snooker", label: "Bida/Bowl", icon: "🎱" },
    { id: "Bảo tàng nghệ thuật", label: "Triển Lãm", icon: "🖼️" },
    { id: "Homestay ngoại thành", label: "Đi Trốn", icon: "🏡" },
];

export const getGoogleMapsLink = (latitude: number, longitude: number, category: string): string => {
    // Tạo link search Google Maps trực tiếp, độ chính xác cao và miễn phí
    return `https://www.google.com/maps/search/${encodeURIComponent(category)}/@${latitude},${longitude},14z`;
};
