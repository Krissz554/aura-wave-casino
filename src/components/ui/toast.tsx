import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, Check, AlertTriangle, Info, Zap } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden border p-3 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full will-change-transform",
  {
    variants: {
      variant: {
        default: [
          // Base cyberpunk container
          "relative",
          // Angular clipping with less height
          "clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // Multi-layer background
          "bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95",
          // Border and glow
          "border border-indigo-500/30",
          "shadow-2xl shadow-indigo-500/20",
          // Backdrop blur
          "backdrop-blur-sm",
          // Text styling
          "text-white",
          // Before pseudo-element for circuit pattern
          "before:absolute before:inset-0",
          "before:bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)]",
          "before:bg-[length:8px_8px]",
          "before:opacity-30",
          "before:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // After pseudo-element for scan line
          "after:absolute after:inset-0",
          "after:bg-gradient-to-r after:from-transparent after:via-indigo-400/20 after:to-transparent",
          "after:translate-x-[-100%] after:animate-[cyber-scan_2s_ease-in-out_infinite]",
          "after:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]"
        ],
        success: [
          // Base cyberpunk container
          "relative",
          // Angular clipping with less height
          "clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // Green-themed background
          "bg-gradient-to-br from-emerald-900/95 via-emerald-800/90 to-slate-900/95",
          // Green border and glow
          "border border-emerald-500/40",
          "shadow-2xl shadow-emerald-500/25",
          // Backdrop blur
          "backdrop-blur-sm",
          // Text styling
          "text-white",
          // Circuit pattern
          "before:absolute before:inset-0",
          "before:bg-[linear-gradient(90deg,transparent_24%,rgba(16,185,129,0.15)_25%,rgba(16,185,129,0.15)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.15)_75%,rgba(16,185,129,0.15)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(16,185,129,0.15)_25%,rgba(16,185,129,0.15)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.15)_75%,rgba(16,185,129,0.15)_76%,transparent_77%,transparent)]",
          "before:bg-[length:8px_8px]",
          "before:opacity-40",
          "before:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // Green scan line
          "after:absolute after:inset-0",
          "after:bg-gradient-to-r after:from-transparent after:via-emerald-400/30 after:to-transparent",
          "after:translate-x-[-100%] after:animate-[cyber-scan_2s_ease-in-out_infinite]",
          "after:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]"
        ],
        destructive: [
          // Base cyberpunk container
          "relative",
          // Angular clipping with less height
          "clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // Red-themed background
          "bg-gradient-to-br from-red-900/95 via-red-800/90 to-slate-900/95",
          // Red border and glow
          "border border-red-500/40",
          "shadow-2xl shadow-red-500/25",
          // Backdrop blur
          "backdrop-blur-sm",
          // Text styling
          "text-white",
          // Circuit pattern
          "before:absolute before:inset-0",
          "before:bg-[linear-gradient(90deg,transparent_24%,rgba(239,68,68,0.15)_25%,rgba(239,68,68,0.15)_26%,transparent_27%,transparent_74%,rgba(239,68,68,0.15)_75%,rgba(239,68,68,0.15)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(239,68,68,0.15)_25%,rgba(239,68,68,0.15)_26%,transparent_27%,transparent_74%,rgba(239,68,68,0.15)_75%,rgba(239,68,68,0.15)_76%,transparent_77%,transparent)]",
          "before:bg-[length:8px_8px]",
          "before:opacity-40",
          "before:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // Red scan line
          "after:absolute after:inset-0",
          "after:bg-gradient-to-r after:from-transparent after:via-red-400/30 after:to-transparent",
          "after:translate-x-[-100%] after:animate-[cyber-scan_2s_ease-in-out_infinite]",
          "after:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]"
        ],
        warning: [
          // Base cyberpunk container
          "relative",
          // Angular clipping with less height
          "clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // Orange-themed background
          "bg-gradient-to-br from-orange-900/95 via-orange-800/90 to-slate-900/95",
          // Orange border and glow
          "border border-orange-500/40",
          "shadow-2xl shadow-orange-500/25",
          // Backdrop blur
          "backdrop-blur-sm",
          // Text styling
          "text-white",
          // Circuit pattern
          "before:absolute before:inset-0",
          "before:bg-[linear-gradient(90deg,transparent_24%,rgba(251,146,60,0.15)_25%,rgba(251,146,60,0.15)_26%,transparent_27%,transparent_74%,rgba(251,146,60,0.15)_75%,rgba(251,146,60,0.15)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(251,146,60,0.15)_25%,rgba(251,146,60,0.15)_26%,transparent_27%,transparent_74%,rgba(251,146,60,0.15)_75%,rgba(251,146,60,0.15)_76%,transparent_77%,transparent)]",
          "before:bg-[length:8px_8px]",
          "before:opacity-40",
          "before:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // Orange scan line
          "after:absolute after:inset-0",
          "after:bg-gradient-to-r after:from-transparent after:via-orange-400/30 after:to-transparent",
          "after:translate-x-[-100%] after:animate-[cyber-scan_2s_ease-in-out_infinite]",
          "after:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]"
        ],
        info: [
          // Base cyberpunk container
          "relative",
          // Angular clipping with less height
          "clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // Blue-themed background
          "bg-gradient-to-br from-cyan-900/95 via-cyan-800/90 to-slate-900/95",
          // Blue border and glow
          "border border-cyan-500/40",
          "shadow-2xl shadow-cyan-500/25",
          // Backdrop blur
          "backdrop-blur-sm",
          // Text styling
          "text-white",
          // Circuit pattern
          "before:absolute before:inset-0",
          "before:bg-[linear-gradient(90deg,transparent_24%,rgba(6,182,212,0.15)_25%,rgba(6,182,212,0.15)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.15)_75%,rgba(6,182,212,0.15)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(6,182,212,0.15)_25%,rgba(6,182,212,0.15)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.15)_75%,rgba(6,182,212,0.15)_76%,transparent_77%,transparent)]",
          "before:bg-[length:8px_8px]",
          "before:opacity-40",
          "before:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]",
          // Blue scan line
          "after:absolute after:inset-0",
          "after:bg-gradient-to-r after:from-transparent after:via-cyan-400/30 after:to-transparent",
          "after:translate-x-[-100%] after:animate-[cyber-scan_2s_ease-in-out_infinite]",
          "after:clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]"
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "relative group/action inline-flex h-8 shrink-0 items-center justify-center px-3 text-sm font-medium font-mono tracking-wider transition-all duration-300 ring-offset-background focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      // Cyberpunk button styling
      "clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))]",
      "bg-gradient-to-r from-slate-700/80 via-slate-600/80 to-slate-700/80",
      "border border-slate-400/30",
      "text-slate-200",
      "hover:bg-gradient-to-r hover:from-indigo-600/80 hover:via-purple-600/80 hover:to-indigo-600/80",
      "hover:border-indigo-400/50 hover:text-white",
      "hover:shadow-lg hover:shadow-indigo-500/25",
      // Inner glow effect
      "before:absolute before:inset-0.5",
      "before:bg-gradient-to-r before:from-transparent before:via-slate-400/10 before:to-transparent",
      "before:clip-path-[polygon(0_0,calc(100%-5px)_0,100%_5px,100%_100%,5px_100%,0_calc(100%-5px))]",
      "hover:before:via-indigo-400/20",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 z-10 rounded-md p-1 transition-all duration-300 opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2",
      // Cyberpunk close button
      "text-slate-300 hover:text-white",
      "hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/25",
      "focus:ring-red-400 focus:ring-offset-slate-900",
      // Different colors based on variant
      "group-data-[variant=success]:text-emerald-300 group-data-[variant=success]:hover:text-white group-data-[variant=success]:hover:bg-emerald-500/20 group-data-[variant=success]:focus:ring-emerald-400",
      "group-data-[variant=destructive]:text-red-300 group-data-[variant=destructive]:hover:text-white group-data-[variant=destructive]:hover:bg-red-500/20 group-data-[variant=destructive]:focus:ring-red-400",
      "group-data-[variant=warning]:text-orange-300 group-data-[variant=warning]:hover:text-white group-data-[variant=warning]:hover:bg-orange-500/20 group-data-[variant=warning]:focus:ring-orange-400",
      "group-data-[variant=info]:text-cyan-300 group-data-[variant=info]:hover:text-white group-data-[variant=info]:hover:bg-cyan-500/20 group-data-[variant=info]:focus:ring-cyan-400",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn(
      "relative z-10 text-xs font-bold font-mono tracking-wider text-white drop-shadow-sm leading-tight",
      className
    )}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(
      "relative z-10 text-xs text-slate-200 font-mono tracking-wide opacity-90 leading-tight",
      className
    )}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

// Icon component for toasts
const ToastIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "success" | "destructive" | "warning" | "info"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const iconMap = {
    default: <Info />,
    success: <Check />,
    destructive: <AlertTriangle />,
    warning: <AlertTriangle />,
    info: <Info />
  }

  const colorMap = {
    default: "text-indigo-400",
    success: "text-emerald-400", 
    destructive: "text-red-400",
    warning: "text-orange-400",
    info: "text-cyan-400"
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative z-10 flex-shrink-0 w-6 h-6 flex items-center justify-center",
        "rounded-sm border backdrop-blur-sm",
        // Variant-specific styling
        variant === "default" && "bg-indigo-500/20 border-indigo-500/30",
        variant === "success" && "bg-emerald-500/20 border-emerald-500/30",
        variant === "destructive" && "bg-red-500/20 border-red-500/30",
        variant === "warning" && "bg-orange-500/20 border-orange-500/30", 
        variant === "info" && "bg-cyan-500/20 border-cyan-500/30",
        colorMap[variant],
        className
      )}
      {...props}
    >
      {React.cloneElement(iconMap[variant], { className: "w-3.5 h-3.5" })}
    </div>
  )
})
ToastIcon.displayName = "ToastIcon"

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastIcon,
}
