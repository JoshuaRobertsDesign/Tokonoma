// Tokonoma Player — a Framer code component
// Wraps <tokonoma-player> (the Tokonoma skin for Video.js v10) and loads the skin
// from tokonoma-site.vercel.app the first time a player appears on the page.
// Apache-2.0 · Joshua Roberts

import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"

const LIB = "https://tokonoma-site.vercel.app/lib"
const MEDIA = "https://tokonoma-site.vercel.app/media"

// load the stylesheet and the script once per page
let loading: Promise<void> | null = null
function loadTokonoma(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve()
    if (window.customElements?.get("tokonoma-player")) return Promise.resolve()
    if (!loading) {
        loading = new Promise((resolve, reject) => {
            if (!document.querySelector("link[data-tokonoma]")) {
                const link = document.createElement("link")
                link.rel = "stylesheet"
                link.href = `${LIB}/tokonoma.css`
                link.dataset.tokonoma = ""
                document.head.appendChild(link)
            }
            const script = document.createElement("script")
            script.type = "module"
            script.src = `${LIB}/tokonoma.js`
            script.dataset.tokonoma = ""
            script.onload = () => resolve()
            script.onerror = () => {
                loading = null
                reject(new Error("Tokonoma: the player script could not load"))
            }
            document.head.appendChild(script)
        })
    }
    return loading
}

type Img = { src?: string; alt?: string } | string | undefined
const imageSrc = (v: Img) => (typeof v === "string" ? v : v?.src) || undefined

interface Props {
    source: {
        src: string
        title: string
        poster?: Img
        chapters?: string
        captions?: string
        captionsLabel: string
        thumbnails?: string
    }
    look: {
        theme: string
        post: string
        titleAlign: string
        titleLayer: string
        seek: string
        floor: string
        chapterStyle: string
        aspect: string
    }
    colours: {
        custom: boolean
        wood: string
        floor: string
        paper: string
        ink: string
        inkSoft: string
        wall: string
        accent: string
        accentDeep: string
    }
    light: {
        shade: boolean
        shadeStrength: number
        paperLight: boolean
        depth: boolean
        postSize: number
        frame: number
    }
    lattice: {
        angle: number
        size: number
        opacity: number
        swing: number
    }
    extras: {
        sound: boolean
        magnifierShape: string
        stillButton: boolean
        clip: boolean
        seal: string
        sealImage?: Img
        sealAlign: string
        volume: number
        remember: boolean
        lazy: boolean
    }
    font?: Record<string, any>
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 800
 */
export default function TokonomaPlayer(props: Props) {
    // each group falls back to its defaults, field by field
    const d = DEFAULTS
    const source = { ...d.source, ...props.source }
    const look = { ...d.look, ...props.look }
    const colours = { ...d.colours, ...props.colours }
    const light = { ...d.light, ...props.light }
    const lattice = { ...d.lattice, ...props.lattice }
    const extras = { ...d.extras, ...props.extras }
    const { font, style } = props
    // the demo film brings its own poster and tracks unless you give others
    const demo = source.src === d.source.src
    const [ready, setReady] = useState(false)
    const [failed, setFailed] = useState(false)
    const host = useRef<HTMLDivElement>(null)
    const onCanvas = RenderTarget.current() === RenderTarget.canvas

    useEffect(() => {
        let alive = true
        loadTokonoma()
            .then(() => alive && setReady(true))
            .catch(() => alive && setFailed(true))
        return () => {
            alive = false
        }
    }, [])

    // every attribute the element reads; it builds its markup once, so the
    // element is re-created (via key) whenever any of them change
    const attrs = useMemo(() => {
        const a: Record<string, string> = {
            src: source.src,
            "captions-label": source.captionsLabel || "English",
            theme: colours.custom ? "custom" : look.theme,
            post: look.post,
            "title-align": look.titleAlign,
            "title-layer": look.titleLayer,
            seek: look.seek,
            floor: look.floor,
            "chapters-style": look.chapterStyle,
            aspect: look.aspect,
            shade: light.shade ? "on" : "none",
            "paper-light": light.paperLight ? "on" : "off",
            parallax: light.depth ? "on" : "off",
            sound: extras.sound ? "on" : "off",
            "magnifier-shape": extras.magnifierShape,
            "still-button": extras.stillButton ? "on" : "off",
            clip: extras.clip ? "on" : "off",
            "seal-align": extras.sealAlign,
            volume: String(extras.volume),
            remember: extras.remember ? "on" : "off",
            preload: onCanvas ? "none" : "metadata",
        }
        if (source.title) a.title = source.title
        const poster = imageSrc(source.poster) || (demo ? `${MEDIA}/poster.webp` : undefined)
        if (poster) a.poster = poster
        const chapters = source.chapters || (demo ? `${MEDIA}/chapters.vtt` : undefined)
        if (chapters) a.chapters = chapters
        const captions = source.captions || (demo ? `${MEDIA}/captions-en.vtt` : undefined)
        if (captions) a.captions = captions
        if (source.thumbnails) a.thumbnails = source.thumbnails
        if (extras.seal) a.seal = extras.seal
        const sealSrc = imageSrc(extras.sealImage)
        if (sealSrc) a["seal-src"] = sealSrc
        if (extras.lazy && !onCanvas) a.loading = "lazy"
        if (colours.custom) {
            a.wood = colours.wood
            a.floor = colours.floor
            a.paper = colours.paper
            a.ink = colours.ink
            a["ink-soft"] = colours.inkSoft
            a.wall = colours.wall
            a.accent = colours.accent
            a["accent-deep"] = colours.accentDeep
        }
        return a
    }, [JSON.stringify([source, look, colours, light, extras]), onCanvas])

    const key = useMemo(() => JSON.stringify(attrs), [attrs])

    // sizes and lattice are CSS custom properties on the player itself
    useEffect(() => {
        if (!ready || !host.current) return
        const apply = () => {
            const tk = host.current?.querySelector<HTMLElement>(".tk")
            if (!tk) return false
            tk.style.setProperty("--tk-post", `${light.postSize}px`)
            tk.style.setProperty("--tk-frame", `${light.frame}px`)
            tk.style.setProperty("--tk-shade", String(light.shadeStrength))
            tk.style.setProperty("--tk-lattice-angle", `${lattice.angle}deg`)
            tk.style.setProperty("--tk-lattice-size", `${lattice.size}px`)
            tk.style.setProperty("--tk-lattice-opacity", String(lattice.opacity))
            tk.style.setProperty("--tk-lattice-swing", String(lattice.swing))
            return true
        }
        if (apply()) return
        // lazy players build later: apply as soon as the markup appears
        const mo = new MutationObserver(() => apply() && mo.disconnect())
        mo.observe(host.current, { childList: true, subtree: true })
        return () => mo.disconnect()
    }, [ready, key, JSON.stringify([light, lattice])])

    const fontFamily = font?.fontFamily
    const wrapStyle: CSSProperties = {
        ...style,
        width: "100%",
        ...(fontFamily ? ({ ["--media-font-family" as any]: fontFamily } as any) : {}),
    }

    if (!ready) {
        return (
            <div ref={host} style={wrapStyle}>
                <div style={placeholder}>
                    {failed ? "The Tokonoma player couldn't load." : null}
                </div>
            </div>
        )
    }

    return (
        <div ref={host} style={wrapStyle}>
            {/* @ts-ignore: a custom element */}
            <tokonoma-player key={key} {...attrs} style={{ display: "block", width: "100%" }} />
        </div>
    )
}

const placeholder: CSSProperties = {
    width: "100%",
    aspectRatio: "16 / 9.5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#2b2118",
    color: "#c9b69f",
    fontSize: 12,
    fontFamily: "ui-monospace, monospace",
}

TokonomaPlayer.displayName = "Tokonoma Player"

const DEFAULTS = {
    source: {
        src: "https://stream.mux.com/uvARTyBix02kTMuAOLGfaedhBu02teeI8P02YVezZ6GkKQ.m3u8",
        title: "A Quiet Year",
        captionsLabel: "English (SDH)",
    },
    look: {
        theme: "hinoki",
        post: "right",
        titleAlign: "center",
        titleLayer: "over",
        seek: "solid",
        floor: "tilt",
        chapterStyle: "kumiko",
        aspect: "auto",
    },
    colours: {
        custom: false,
        wood: "#4a3b30",
        floor: "#c9b69f",
        paper: "#efe6d6",
        ink: "#2b2118",
        inkSoft: "#6e5a47",
        wall: "#cfc5b4",
        accent: "#a5ba84",
        accentDeep: "#507024",
    },
    light: {
        shade: true,
        shadeStrength: 0.35,
        paperLight: true,
        depth: true,
        postSize: 60,
        frame: 2,
    },
    lattice: { angle: 20, size: 54, opacity: 0.08, swing: 0.7 },
    extras: {
        sound: false,
        magnifierShape: "circle",
        stillButton: false,
        clip: false,
        seal: "",
        sealAlign: "left",
        volume: 0.8,
        remember: false,
        lazy: true,
    },
}

addPropertyControls(TokonomaPlayer, {
    source: {
        type: ControlType.Object,
        title: "Video",
        controls: {
            src: {
                type: ControlType.String,
                title: "Source",
                placeholder: "Mux / HLS (.m3u8) or MP4 URL",
                defaultValue: DEFAULTS.source.src,
            },
            title: { type: ControlType.String, title: "Title", defaultValue: "A Quiet Year" },
            poster: { type: ControlType.ResponsiveImage, title: "Poster" },
            chapters: { type: ControlType.File, title: "Chapters", allowedFileTypes: ["vtt"] },
            captions: { type: ControlType.File, title: "Captions", allowedFileTypes: ["vtt"] },
            captionsLabel: { type: ControlType.String, title: "Caption Label", defaultValue: "English (SDH)" },
            thumbnails: {
                type: ControlType.File,
                title: "Thumbnails",
                allowedFileTypes: ["vtt"],
                description: "Storyboard VTT for MP4s. Mux streams bring their own.",
            },
        },
    },
    look: {
        type: ControlType.Object,
        title: "Layout",
        controls: {
            theme: {
                type: ControlType.Enum,
                title: "Scheme",
                options: ["hinoki", "urushi", "aizome", "sakura"],
                optionTitles: ["Hinoki", "Urushi", "Aizome", "Sakura"],
                defaultValue: "hinoki",
            },
            post: {
                type: ControlType.Enum,
                title: "Post",
                options: ["right", "left", "tuck", "none"],
                optionTitles: ["Right", "Left", "Tucked", "Hidden"],
                defaultValue: "right",
            },
            titleAlign: {
                type: ControlType.Enum,
                title: "Title",
                options: ["left", "center", "right", "none"],
                optionTitles: ["Left", "Center", "Right", "Hidden"],
                defaultValue: "center",
            },
            titleLayer: {
                type: ControlType.Enum,
                title: "Title Layer",
                options: ["over", "under"],
                optionTitles: ["Over Shade", "Under Shade"],
                displaySegmentedControl: true,
                defaultValue: "over",
            },
            seek: {
                type: ControlType.Enum,
                title: "Seek Bar",
                options: ["solid", "clear"],
                optionTitles: ["Solid", "Clear"],
                displaySegmentedControl: true,
                defaultValue: "solid",
            },
            floor: {
                type: ControlType.Enum,
                title: "Floor",
                options: ["tilt", "slide", "mask", "fixed"],
                optionTitles: ["Tilt", "Slide", "Mask", "Fixed"],
                defaultValue: "tilt",
            },
            chapterStyle: {
                type: ControlType.Enum,
                title: "Joints",
                options: ["kumiko", "peg", "rail", "gap"],
                optionTitles: ["Kumiko", "Peg", "Rail", "Gap"],
                defaultValue: "kumiko",
            },
            aspect: {
                type: ControlType.Enum,
                title: "Shape",
                options: ["auto", "16:9", "21:9", "4:3", "1:1", "9:16"],
                optionTitles: ["From Video", "16:9", "21:9", "4:3", "1:1", "9:16"],
                defaultValue: "auto",
            },
        },
    },
    colours: {
        type: ControlType.Object,
        title: "Colours",
        controls: {
            custom: { type: ControlType.Boolean, title: "Custom", defaultValue: false, enabledTitle: "On", disabledTitle: "Off" },
            wood: { type: ControlType.Color, title: "Wood", defaultValue: "#4a3b30", hidden: (p: any) => !p.custom },
            floor: { type: ControlType.Color, title: "Floor", defaultValue: "#c9b69f", hidden: (p: any) => !p.custom },
            paper: { type: ControlType.Color, title: "Paper", defaultValue: "#efe6d6", hidden: (p: any) => !p.custom },
            ink: { type: ControlType.Color, title: "Ink", defaultValue: "#2b2118", hidden: (p: any) => !p.custom },
            inkSoft: { type: ControlType.Color, title: "Quiet Ink", defaultValue: "#6e5a47", hidden: (p: any) => !p.custom },
            wall: { type: ControlType.Color, title: "Wall", defaultValue: "#cfc5b4", hidden: (p: any) => !p.custom },
            accent: { type: ControlType.Color, title: "Accent", defaultValue: "#a5ba84", hidden: (p: any) => !p.custom },
            accentDeep: { type: ControlType.Color, title: "Accent on Paper", defaultValue: "#507024", hidden: (p: any) => !p.custom },
        },
    },
    light: {
        type: ControlType.Object,
        title: "Light & Frame",
        controls: {
            shade: { type: ControlType.Boolean, title: "Shade", defaultValue: true },
            shadeStrength: { type: ControlType.Number, title: "Strength", min: 0, max: 1, step: 0.05, defaultValue: 0.35, hidden: (p: any) => !p.shade },
            paperLight: { type: ControlType.Boolean, title: "Lit Paper", defaultValue: true },
            depth: { type: ControlType.Boolean, title: "Parallax", defaultValue: true, description: "On iPhone it starts off (no prompt) until switched on in the player." },
            postSize: { type: ControlType.Number, title: "Post", min: 48, max: 96, step: 1, unit: "px", defaultValue: 60 },
            frame: { type: ControlType.Number, title: "Frame", min: 0, max: 16, step: 1, unit: "px", defaultValue: 2 },
        },
    },
    lattice: {
        type: ControlType.Object,
        title: "Lattice",
        controls: {
            angle: { type: ControlType.Number, title: "Angle", min: -30, max: 30, step: 1, unit: "°", defaultValue: 20 },
            size: { type: ControlType.Number, title: "Size", min: 20, max: 80, step: 1, unit: "px", defaultValue: 54 },
            opacity: { type: ControlType.Number, title: "Opacity", min: 0, max: 0.5, step: 0.01, defaultValue: 0.08 },
            swing: { type: ControlType.Number, title: "Swing", min: 0, max: 1, step: 0.05, defaultValue: 0.7, description: "How far it swings in as the settings door opens." },
        },
    },
    extras: {
        type: ControlType.Object,
        title: "Extras",
        controls: {
            sound: { type: ControlType.Boolean, title: "Sounds", defaultValue: false },
            magnifierShape: {
                type: ControlType.Enum,
                title: "Lens",
                options: ["circle", "square"],
                optionTitles: ["Round", "Square"],
                displaySegmentedControl: true,
                defaultValue: "circle",
            },
            stillButton: {
                type: ControlType.Boolean,
                title: "Still Button",
                defaultValue: false,
                description: "A camera on the picture that saves the frame (phones: fullscreen only). Shift+S works either way.",
            },
            clip: {
                type: ControlType.Boolean,
                title: "Save Clip",
                defaultValue: false,
                description: "Viewers mark a start and end (I / O, the pegs, or Settings → Clip) and download it. Off lets no one download the video.",
            },
            seal: { type: ControlType.String, title: "Seal Text", placeholder: "Title initials" },
            sealImage: { type: ControlType.ResponsiveImage, title: "Seal Image" },
            sealAlign: {
                type: ControlType.Enum,
                title: "Seal",
                options: ["left", "center", "right"],
                optionTitles: ["Left", "Center", "Right"],
                displaySegmentedControl: true,
                defaultValue: "left",
            },
            volume: { type: ControlType.Number, title: "Volume", min: 0, max: 1, step: 0.05, defaultValue: 0.8 },
            remember: { type: ControlType.Boolean, title: "Remember", defaultValue: false, description: "Keep speed, volume and scheme between visits, and resume each video where it was left." },
            lazy: { type: ControlType.Boolean, title: "Lazy Load", defaultValue: true },
        },
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "monospace",
        description: "The player uses the family; sizes are set by the skin.",
    },
})
