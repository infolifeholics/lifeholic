'use client';

import { toast } from 'sonner';
import Link from 'next/link';

export function showAppleCartNotification(productName: string, productImage: string, quantity = 1) {
  toast.custom((t) => (
    <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[22px] border border-neutral-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 pointer-events-auto">
      {/* Apple Notification Header */}
      <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-500 tracking-widest uppercase">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gold/15 text-gold text-[10px] font-bold font-display border border-gold/25">
            LH
          </div>
          <span>THELIFEHOLICS SHOP</span>
        </div>
        <span>now</span>
      </div>
      
      {/* Body content */}
      <div className="mt-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productImage}
          alt=""
          className="h-11 w-11 rounded-xl object-cover border border-neutral-200"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-neutral-900 truncate">Added to Cart</h4>
          <p className="mt-0.5 text-xs text-neutral-600 font-medium line-clamp-1">
            {quantity} × {productName} has been added to your bag.
          </p>
        </div>
        <Link
          href="/shop/cart"
          onClick={() => toast.dismiss(t)}
          className="rounded-full bg-neutral-100 hover:bg-neutral-200 px-4 py-1.5 text-xs font-semibold text-neutral-800 transition-all border border-neutral-200/50 shadow-sm"
        >
          View Bag
        </Link>
      </div>
    </div>
  ), {
    position: 'top-right',
    duration: 3500,
  });
}
