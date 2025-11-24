import { DetailedTime } from "../types";

const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());

export const calculateDetailedTime = (startDate: string, countFromDayOne: boolean): DetailedTime => {
  const start = new Date(startDate);
  const now = new Date();
  
  if (!isValidDate(start)) {
    return {
      years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0
    };
  }

  // Total Days Calculation
  const diffTime = now.getTime() - start.getTime();
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + (countFromDayOne ? 1 : 0);

  // Detailed Breakdown
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  let seconds = now.getSeconds() - start.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  // Apply Day 1 logic to the breakdown
  if (countFromDayOne) {
    days += 1;
    // Check for overflow after adding 1 day
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    // If the calculation was done based on previous month days, we need to be careful.
    // Simplest approach: If adding 1 day exceeds the days in the calculated month window? 
    // Actually, simpler logic: 
    // The previous logic calculated elapsed time (0-based). Adding 1 day makes it 1-based (Duration).
    // If we have 0 years 0 months 0 days elapsed -> 1 day duration.
    // If days >= daysInCurrentMonth (approx), we might need to bump month, but strictly speaking "Day 1" is usually just +1 to the day count visually.
    // However, if days becomes equal to the days in previous month (during the negative adjust), it might overlap.
    // Let's keep it simple: Just add to days. If days becomes >= 30/31 (depending on month), roll over.
    
    // To do this accurately without complex calendar math:
    // We already calculated the "Elapsed" time. Now we just add 1 day to the lowest unit.
    // If that overflows the current month's max days (relative to start date logic), it's tricky.
    // BUT for a "Counter", users expect: Start Today -> 1 Day. 
    // My previous code gave 0 days. So `days += 1` is correct.
    
    // We just need to check if days overflowed the 'previous month' logic used in the subtraction above?
    // No, we are displaying "Time Together".
    // Let's assume standard month length for display safety or use current month max.
    const maxDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); 
    if (days >= maxDays) {
        // This is an approximation for display purposes
        days = 0;
        months++;
        if (months >= 12) {
            months = 0;
            years++;
        }
    }
  }

  // Calculate weeks from remaining days
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;

  return {
    years,
    months,
    weeks,
    days: remainingDays,
    hours,
    minutes,
    seconds,
    totalDays
  };
};

export const getNextMilestone = (startDate: string): { daysLeft: number; label: string; targetDate: string } => {
  const start = new Date(startDate);
  if (!isValidDate(start)) {
    return { daysLeft: 0, label: 'Đang tải...', targetDate: '' };
  }

  start.setHours(0,0,0,0);
  const now = new Date();
  now.setHours(0,0,0,0);
  
  const diffTime = now.getTime() - start.getTime();
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const milestones = [100, 200, 300, 365, 730, 1000, 1095, 1460, 1825, 2000, 3000];
  
  for (const m of milestones) {
    if (m > daysPassed) {
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + m);
      const daysLeft = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      try {
        return { 
          daysLeft, 
          label: `Mốc ${m} Ngày`,
          targetDate: targetDate.toLocaleDateString('vi-VN')
        };
      } catch (e) {
        return { daysLeft: 0, label: 'Lỗi ngày tháng', targetDate: '' };
      }
    }
  }
  
  const currentYear = new Date().getFullYear();
  let nextAnniversary = new Date(start);
  nextAnniversary.setFullYear(currentYear);
  if (nextAnniversary < now) {
    nextAnniversary.setFullYear(currentYear + 1);
  }
  const daysLeft = Math.ceil((nextAnniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  try {
    return { 
      daysLeft, 
      label: 'Kỷ niệm 1 Năm', 
      targetDate: nextAnniversary.toLocaleDateString('vi-VN')
    };
  } catch (e) {
    return { daysLeft: 0, label: 'Lỗi ngày tháng', targetDate: '' };
  }
};

export const getZodiacSign = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (!isValidDate(date)) return '';
  
  const day = date.getDate();
  const month = date.getMonth() + 1;

  if ((month == 1 && day <= 19) || (month == 12 && day >= 22)) return "Ma Kết";
  if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return "Bảo Bình";
  if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "Song Ngư";
  if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "Bạch Dương";
  if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "Kim Ngưu";
  if ((month == 5 && day >= 21) || (month == 6 && day <= 21)) return "Song Tử";
  if ((month == 6 && day >= 22) || (month == 7 && day <= 22)) return "Cự Giải";
  if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "Sư Tử";
  if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "Xử Nữ";
  if ((month == 9 && day >= 23) || (month == 10 && day <= 23)) return "Thiên Bình";
  if ((month == 10 && day >= 24) || (month == 11 && day <= 21)) return "Bọ Cạp";
  if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return "Nhân Mã";
  return "";
};

export const formatDateVN = (dateString: string): string => {
  try {
    const d = new Date(dateString);
    if (!isValidDate(d)) return "Ngày không hợp lệ";
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return "Lỗi ngày tháng";
  }
};

export const hexToRgb = (hex: string): string => {
    if (!hex || typeof hex !== 'string') return '250, 52, 82';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '250, 52, 82';
}