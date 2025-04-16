"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeLogo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Only show logo after component is mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    // Return a placeholder with the same dimensions during SSR
    return <div className="w-[139px] h-[63px]" />;
  }
  
  // Use the original SVG but with theme-aware colors
  return (
    <svg width="139" height="63" viewBox="0 0 139 63" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M138.43 1.8528C136.949 -0.688247 133.379 -0.368005 131.305 1.32371C129.761 2.47936 128.839 4.39385 128.776 6.32226C128.476 10.4645 132.22 13.3189 133.128 16.9181C133.491 18.3453 133.296 20.3294 131.815 20.9977C130.39 21.6312 129.146 20.399 128.595 19.1807C127.847 17.67 127.77 16.208 128.036 14.3422C128.141 13.6252 128.245 12.6714 127.959 12.0518C127.407 11.0911 126.338 13.0404 125.919 14.1473C125.263 15.7764 124.396 17.6282 123.23 18.9092C120.394 21.7148 120.841 16.7649 121.309 15.2194C121.91 12.3651 122.832 9.49684 123.6 6.65643C123.831 5.7514 124.061 4.60967 123.502 3.83691C122.287 2.47936 120.338 3.59325 120.01 5.18749C119.381 7.35957 118.557 10.6525 117.893 13.1309C117.446 14.934 116.95 16.4656 116 18.032C115.092 19.661 112.284 23.9216 111.174 20.7262C110.775 18.4288 111.656 15.9017 112.151 13.6321C112.473 12.4069 112.829 11.2234 113.22 10.012C113.681 8.51523 114.526 6.39188 113.905 5.459C113.374 4.61663 112.158 4.60271 111.369 5.10395C109.637 6.25265 109.665 8.89116 108.512 10.5759C107.29 12.6018 105.355 13.4581 104.44 11.0493C103.28 7.39438 99.6621 5.73747 96.2184 7.60323C94.1647 8.67535 92.4953 10.5481 91.245 12.4834C88.9049 15.8112 88.8421 19.8699 87.1028 23.497C86.4601 24.771 85.3844 26.5741 83.8826 26.7133C82.6253 26.6994 82.4227 25.0982 82.5205 24.0748C82.8558 20.8376 84.5881 17.9206 85.6848 14.9897C86.4252 13.1657 86.5509 10.7987 83.9245 10.931C82.744 10.924 81.354 11.0911 80.39 10.2696C79.3423 9.43418 78.9721 7.52665 77.9662 6.94186C77.8754 6.88617 77.6728 6.80263C76.3037 6.371 75.1302 7.78424 75.1791 9.10698C75.1652 10.4367 75.9265 11.7246 75.9894 13.1657C75.8567 17.9206 73.6284 23.4691 70.5829 27.1798C69.1859 28.7601 66.9716 30.3543 64.7922 29.9505C63.7305 29.7347 62.9202 28.7322 63.018 27.8202C63.1786 26.4488 64.6874 25.8988 65.819 25.4184C74.0196 22.578 75.5773 9.66392 67.4885 11.5575C65.5187 12.1214 63.7724 13.4163 62.4592 14.9618C60.7199 17.0364 59.4346 19.675 58.7082 22.2995C58.1004 24.3393 58.0306 26.588 57.1714 28.5164C56.6266 29.679 55.2784 31.7885 53.9373 31.3359C53.0851 30.786 53.3366 29.3936 53.6369 27.8899C54.3075 24.2071 56.7872 20.218 55.7953 16.7092C55.2505 15.0245 53.3366 14.1334 51.6532 14.565C49.7672 14.9897 48.5657 16.8206 46.6518 16.2428C44.2908 15.3308 43.0684 16.4029 42.4188 18.756C40.7703 25.0843 39.7994 33.5289 32.4999 35.7776C30.7047 36.3623 28.7628 35.0048 29.3496 33.1321C29.7547 31.879 31.1937 31.2663 32.3392 30.6955C35.7759 28.9759 38.6328 25.5368 38.9332 21.7426C39.1986 19.5566 37.8016 17.2175 35.4476 17.1687C26.6393 16.4865 17.9987 40.9153 30.5021 39.878C31.2286 39.7249 31.9271 39.4534 32.5907 39.1122C34.3789 38.2629 35.6642 36.6547 37.5082 36.8775C38.3534 36.9819 39.2196 37.4553 40.0858 37.3788C41.9368 37.149 42.6004 34.8934 42.9566 33.2992C43.5713 30.5075 44.207 27.8481 45.3106 25.126C46.2047 23.0027 47.3154 20.6218 49.3061 19.3478C52.2958 17.8649 51.4087 22.1882 50.8219 23.6989C49.8789 26.6855 48.5867 29.5328 48.7823 32.6308C48.901 35.6383 51.6392 37.0098 54.1119 35.1997C55.3343 34.4061 56.5288 32.6587 58.0027 32.4777C59.1831 32.3176 60.3916 33.2992 61.4952 33.7656C62.7386 34.3365 64.1566 34.42 65.4768 34.0719C69.7726 32.9232 73.1464 28.2658 75.1023 24.2419C76.4784 21.5894 77.114 18.2896 78.4063 15.6719C79.2585 14.1264 81.1165 14.1055 80.9698 16.1523C80.9069 16.8763 80.6275 17.5655 80.3411 18.2408C79.0559 21.2483 77.8544 24.4577 78.2246 27.7089C78.532 30.8834 81.6544 32.2062 84.2389 30.3613C85.573 29.6233 86.7116 27.5627 88.1505 27.2146C89.4428 26.9918 90.5395 28.405 91.7549 28.8715C93.6199 29.679 95.8831 29.4632 97.6154 28.4259C100.465 26.7342 102.833 22.8078 103.909 19.4174C104.3 18.0946 105.285 16.0061 106.556 15.7276C106.773 15.6859 106.962 15.7207 107.101 15.8738C107.597 16.6466 106.85 18.1294 106.57 19.8003C106.438 20.4547 106.326 21.123 106.284 21.7844C105.865 24.8058 108.184 27.7785 111.32 26.2121C113.304 25.4115 114.561 22.5362 116.678 23.6153C117.425 23.9843 118.152 24.6248 119.011 24.771C121.197 25.2235 122.783 22.4457 124.452 22.0907C125.43 21.9584 126.289 22.8426 127.191 23.4134C130.313 25.5785 135.321 24.2001 136.802 20.3711C139.296 13.5207 131.871 10.0886 132.681 4.93687C132.89 3.96222 133.708 2.61164 134.846 3.02238C136.076 3.58629 135.405 6.14822 136.53 6.92098L136.572 6.94186C137.158 7.2273 137.906 6.76782 138.311 6.23176C139.233 5.00649 139.191 3.14769 138.416 1.83888L138.43 1.8528ZM29.8665 26.6715C30.586 24.7014 31.5499 22.7938 32.9958 21.2971C34.2811 19.8908 36.3697 19.4452 35.9994 22.0489C35.6642 24.2419 34.6792 26.2817 33.0797 27.6183C32.2903 28.2867 30.1389 29.7556 29.643 28.1544L29.629 28.0848C29.5731 27.6462 29.7058 27.1241 29.8595 26.6785L29.8665 26.6715ZM62.9621 22.8565C62.8364 21.8958 63.3533 20.9211 63.8283 19.8003C64.5477 18.2687 65.5117 16.6048 66.6712 15.4561C68.0263 14.029 69.4304 14.4397 69.3186 16.4308C69.1021 19.299 67.5513 22.028 64.9878 23.2812C64.3242 23.5944 63.2206 23.8103 62.9831 22.9191L62.9691 22.8495L62.9621 22.8565ZM100.186 19.9882C99.5643 21.5686 98.726 23.2672 97.7411 24.4159C95.5199 27.0753 92.5302 26.219 92.4045 22.6894C92.1181 19.2364 93.6339 15.5954 95.3103 12.7132C95.9879 11.6968 96.9379 10.1443 98.279 10.2139C99.4455 10.5481 99.3477 12.1075 99.8576 13.2771C100.242 14.2517 100.926 15.1428 101.08 16.0548L101.094 16.1314C101.283 17.2105 100.71 18.582 100.186 19.9813V19.9882Z" fill={resolvedTheme === 'dark' ? 'white' : '#222222'}/>
      <path d="M110.384 34.2808L110.3 34.2529C96.7423 30.9739 79.2794 36.7174 66.8528 40.6995C55.1737 44.8627 43.6691 49.8334 30.9422 47.5499C28.672 47.1879 26.4298 46.6727 24.1736 46.1924C22.574 45.8164 20.8766 45.712 20.0454 44.6329C19.3818 43.7558 19.6263 42.44 19.8498 41.3887C20.702 37.4902 21.3935 33.5359 22.4692 29.7208C23.035 27.4165 24.2295 25.0912 24.4111 22.7242C24.46 21.0882 22.9582 20.7819 21.9034 21.7217C20.2759 23.128 19.6612 25.5089 18.6553 27.4165C16.8741 31.3081 13.2907 36.5921 9.02281 37.6155C6.48022 38.1724 5.56516 35.144 5.51627 33.0207C5.47435 25.0355 9.69338 15.0523 14.7227 8.78674C16.2664 7.01148 20.1851 3.20339 22.6019 4.70017C24.7534 6.71212 23.056 11.4809 21.5122 13.6878C20.9045 14.5093 19.7729 16.3333 21.2189 16.7649C22.0292 16.9947 22.8883 16.7162 23.6078 16.3055C28.0014 13.653 29.4823 5.12484 25.4309 2.3262C11.0695 -4.37103 -7.53199 30.7372 3.18323 40.5324C6.17985 43.0665 10.2941 42.1894 13.0532 39.4812C13.7238 38.8338 15.7285 36.6687 16.0918 37.7477C16.4131 38.8825 15.6098 42.44 14.7297 43.8463C14.0591 44.8348 12.8227 45.0646 11.6772 45.3639C8.00996 46.1924 4.44055 48.0094 2.20531 51.0239C0.277406 53.6067 -0.791321 57.554 0.996876 60.4431C2.91081 63.5899 7.50703 63.5202 10.4478 61.9121C13.9962 59.9976 16.0988 55.8832 17.3631 51.8871C17.7403 50.6549 18.0756 49.4018 18.809 48.7891C20.5832 47.4107 23.5589 49.0746 25.5357 49.4783C29.8316 50.7732 34.2392 52.1169 38.7446 52.2282C53.7487 52.451 67.8936 43.2823 82.4437 39.9407C91.6222 37.7268 101.751 34.963 110.636 37.4205C111.523 37.692 112.536 38.1167 113.43 37.8452C113.73 37.7408 113.926 37.5041 113.933 37.1908C113.898 35.8472 111.753 34.6428 110.391 34.2877L110.384 34.2808ZM13.2768 51.901C12.4525 54.4073 11.3558 57.2755 9.24633 58.821C6.99013 60.4292 4.54533 58.6957 4.86665 56.0572C5.15304 52.7504 8.12172 49.4296 11.3419 48.0094C12.1312 47.6683 13.4165 47.355 13.8146 48.3227L13.8356 48.3853C14.129 49.1999 13.619 50.7593 13.2768 51.8871V51.901Z" fill={resolvedTheme === 'dark' ? 'white' : '#222222'}/>
    </svg>
  );
}
