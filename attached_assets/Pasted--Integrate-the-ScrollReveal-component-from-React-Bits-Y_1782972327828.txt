## Integrate the <ScrollReveal /> component from React Bits

You are helping integrate an open-source React component into an existing application.

### Component: ScrollReveal
### Variant: JavaScript + CSS
### Dependencies: gsap

---

### Usage Example
```jsx
import ScrollReveal from './ScrollReveal';

<ScrollReveal
  baseOpacity={0}
  enableBlur={true}
  baseRotation={5}
  blurStrength={10}
>
  When does a man die? When he is hit by a bullet? No! When he suffers a disease?
  No! When he ate a soup made out of a poisonous mushroom?
  No! A man dies when he is forgotten!
</ScrollReveal>
```

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | — | The text or elements to be animated. If a string is provided, it will be split into words. |
| scrollContainerRef | React.RefObject | window | Optional ref for the scroll container. If provided, GSAP will use this container for scroll triggers; otherwise, it defaults to the window. |
| enableBlur | boolean | true | Enables the blur animation effect on the words. |
| baseOpacity | number | 0.1 | The initial opacity value for the words before the animation. |
| baseRotation | number | 3 | The starting rotation (in degrees) for the container before it animates to 0. |
| blurStrength | number | 4 | The strength of the blur effect (in pixels) applied at the start of the animation. |
| containerClassName | string | "" | Additional CSS class(es) to apply to the container element. |
| textClassName | string | "" | Additional CSS class(es) to apply to the text element. |
| rotationEnd | string | "bottom bottom" | The scroll trigger end point for the container rotation animation. |
| wordAnimationEnd | string | "bottom bottom" | The scroll trigger end point for the word opacity and blur animations. The animation will complete when the bottom of the text reaches the bottom of the container. |

### Full Component Source
```jsx
import { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './ScrollReveal.css';

gsap.registerPlugin(ScrollTrigger);

const ScrollReveal = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom bottom',
  wordAnimationEnd = 'bottom bottom'
}) => {
  const containerRef = useRef(null);

  const splitText = useMemo(() => {
    const text = typeof children === 'string' ? children : '';
    return text.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word;
      return (
        <span className="word" key={index}>
          {word}
        </span>
      );
    });
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scroller = scrollContainerRef && scrollContainerRef.current ? scrollContainerRef.current : window;

    gsap.fromTo(
      el,
      { transformOrigin: '0% 50%', rotate: baseRotation },
      {
        ease: 'none',
        rotate: 0,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: 'top bottom',
          end: rotationEnd,
          scrub: true
        }
      }
    );

    const wordElements = el.querySelectorAll('.word');

    gsap.fromTo(
      wordElements,
      { opacity: baseOpacity, willChange: 'opacity' },
      {
        ease: 'none',
        opacity: 1,
        stagger: 0.05,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: 'top bottom-=20%',
          end: wordAnimationEnd,
          scrub: true
        }
      }
    );

    if (enableBlur) {
      gsap.fromTo(
        wordElements,
        { filter: `blur(${blurStrength}px)` },
        {
          ease: 'none',
          filter: 'blur(0px)',
          stagger: 0.05,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top bottom-=20%',
            end: wordAnimationEnd,
            scrub: true
          }
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength]);

  return (
    <h2 ref={containerRef} className={`scroll-reveal ${containerClassName}`}>
      <p className={`scroll-reveal-text ${textClassName}`}>{splitText}</p>
    </h2>
  );
};

export default ScrollReveal;

```

### Component CSS
```css
.scroll-reveal {
  margin: 20px 0;
}

.scroll-reveal-text {
  font-size: clamp(1.6rem, 4vw, 3rem);
  line-height: 1.5;
  font-weight: 600;
}

.word {
  display: inline-block;
}

```

### Integration Instructions
1. Install any listed dependencies.
2. Copy the component source into the appropriate directory in the project.
3. Import the CSS file alongside the component.
4. Import and render the component using the usage example above as a starting point.
5. Adjust props as needed for the specific use case — refer to the props table for all available options.
