import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import "./PillNav.css";

export interface PillNavItem<TId extends string = string> {
  id: TId;
  label: string;
  count?: number;
  ariaLabel?: string;
}

export interface PillNavProps<TId extends string = string> {
  logoSrc: string;
  logoAlt?: string;
  items: PillNavItem<TId>[];
  activeId?: TId;
  onSelect?: (id: TId) => void;
  onLogoClick?: () => void;
  className?: string;
  ease?: string;
  /** Fill color used by the growing hover circle + active pill. */
  baseColor?: string;
  /** Background of the pill track + logo puck. */
  navBg?: string;
  /** Resting pill background. */
  pillColor?: string;
  /** Text color revealed while hovering / active. */
  hoveredPillTextColor?: string;
  /** Resting pill text color. */
  pillTextColor?: string;
  initialLoadAnimation?: boolean;
}

/**
 * PillNav (React Bits, adapted).
 *
 * Adapted for this app: state-based navigation (no react-router — items call
 * `onSelect(id)`), optional count badges rendered in BOTH label stacks so they
 * survive the hover swap, and theme-aware colors driven by the app's HSL CSS
 * variables. The GSAP hover-circle / label-rise animation is preserved.
 */
export default function PillNav<TId extends string = string>({
  logoSrc,
  logoAlt = "Logo",
  items,
  activeId,
  onSelect,
  onLogoClick,
  className = "",
  ease = "power3.easeOut",
  baseColor = "hsl(var(--primary))",
  navBg = "hsl(var(--muted))",
  pillColor = "transparent",
  hoveredPillTextColor = "hsl(var(--primary-foreground))",
  pillTextColor = "hsl(var(--muted-foreground))",
  initialLoadAnimation = true,
}: PillNavProps<TId>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRefs = useRef<(gsap.core.Timeline | null)[]>([]);
  const activeTweenRefs = useRef<(gsap.core.Tween | null)[]>([]);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLButtonElement | null>(null);

  // Re-run the pill layout whenever labels or counts change (badges alter the
  // pill width, which the circle geometry below depends on).
  const layoutSignature = items
    .map((i) => `${i.id}:${i.label}:${i.count ?? ""}`)
    .join("|");

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta =
          Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });

        const label = pill.querySelector<HTMLElement>(".pill-label");
        const white = pill.querySelector<HTMLElement>(".pill-label-hover");

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(
          circle,
          { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" },
          0,
        );

        if (label) {
          tl.to(
            label,
            { y: -(h + 8), duration: 2, ease, overwrite: "auto" },
            0,
          );
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(
            white,
            { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" },
            0,
          );
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener("resize", onResize);

    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    const menu = mobileMenuRef.current;
    if (menu) {
      gsap.set(menu, { visibility: "hidden", opacity: 0, scaleY: 1 });
    }

    if (initialLoadAnimation) {
      const logoEl = logoRef.current;
      const navItems = navItemsRef.current;

      if (logoEl) {
        gsap.set(logoEl, { scale: 0 });
        gsap.to(logoEl, { scale: 1, duration: 0.6, ease });
      }

      if (navItems) {
        gsap.set(navItems, { width: 0, overflow: "hidden" });
        gsap.to(navItems, { width: "auto", duration: 0.6, ease });
      }
    }

    return () => window.removeEventListener("resize", onResize);
  }, [layoutSignature, ease, initialLoadAnimation]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: "auto",
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const setMenuOpen = (open: boolean) => {
    setIsMobileMenuOpen(open);

    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;

    if (hamburger) {
      const lines = hamburger.querySelectorAll<HTMLElement>(".hamburger-line");
      if (open) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease });
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease });
      }
    }

    if (menu) {
      if (open) {
        gsap.set(menu, { visibility: "visible" });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease,
            transformOrigin: "top center",
          },
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          duration: 0.2,
          ease,
          transformOrigin: "top center",
          onComplete: () => {
            gsap.set(menu, { visibility: "hidden" });
          },
        });
      }
    }
  };

  const toggleMobileMenu = () => setMenuOpen(!isMobileMenuOpen);

  const cssVars = {
    "--base": baseColor,
    "--nav-bg": navBg,
    "--pill-bg": pillColor,
    "--hover-text": hoveredPillTextColor,
    "--pill-text": pillTextColor,
  } as CSSProperties;

  const renderLabel = (item: PillNavItem<TId>) => (
    <>
      {item.label}
      {item.count !== undefined && item.count > 0 && (
        <span className="pill-badge">{item.count}</span>
      )}
    </>
  );

  return (
    <div className={`pill-nav-container ${className}`.trim()} style={cssVars}>
      <nav className="pill-nav" aria-label="Primary">
        <button
          type="button"
          className="pill-logo"
          aria-label="Home"
          onMouseEnter={handleLogoEnter}
          onClick={onLogoClick}
          ref={(el) => {
            logoRef.current = el;
          }}
        >
          <img src={logoSrc} alt={logoAlt} ref={logoImgRef} />
        </button>

        <div className="pill-nav-items desktop-only" ref={navItemsRef}>
          <ul className="pill-list" role="menubar">
            {items.map((item, i) => (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`pill${activeId === item.id ? " is-active" : ""}`}
                  aria-label={item.ariaLabel || item.label}
                  aria-current={activeId === item.id ? "page" : undefined}
                  onMouseEnter={() => handleEnter(i)}
                  onMouseLeave={() => handleLeave(i)}
                  onClick={() => onSelect?.(item.id)}
                >
                  <span
                    className="hover-circle"
                    aria-hidden="true"
                    ref={(el) => {
                      circleRefs.current[i] = el;
                    }}
                  />
                  <span className="label-stack">
                    <span className="pill-label">{renderLabel(item)}</span>
                    <span className="pill-label-hover" aria-hidden="true">
                      {renderLabel(item)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="mobile-menu-button mobile-only"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          ref={hamburgerRef}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      <div className="mobile-menu-popover mobile-only" ref={mobileMenuRef}>
        <ul className="mobile-menu-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`mobile-menu-link${activeId === item.id ? " is-active" : ""}`}
                aria-current={activeId === item.id ? "page" : undefined}
                onClick={() => {
                  onSelect?.(item.id);
                  setMenuOpen(false);
                }}
              >
                {renderLabel(item)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
