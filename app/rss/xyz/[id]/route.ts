import type { NextRequest } from "next/server"
import rss from "rss"
import { requestNextData } from "@/app/xyz-tools"

export const revalidate = 3600

// Remove SELF_URL if it's not needed elsewhere in your application
// const SELF_URL = process.env.SELF_URL;

export const GET = async (_req: NextRequest, { params }: { params: { id: string } }) => {
  console.log("Generate Xiaoyuzhou RSS for podcast id:", params.id)

  const link = `https://www.xiaoyuzhoufm.com/podcast/${params.id}`

  const res = await requestNextData(link)

  if (!res.ok) {
    return new Response(null, {
      status: res.status,
      statusText: res.statusText,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageData = res.data as any

  const episodes: {
    title: string
    enclosureUrl: string
    itunesDuration: number
    enclosureType: string
    link: string
    pubDate: Date
    description: string
    itunesItemImage: string | undefined
    isPrivateMedia: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }[] = pageData.props.pageProps.podcast.episodes.map((item: any) => ({
    title: item.title,
    enclosureUrl: item.enclosure.url,
    itunesDuration: item.duration,
    enclosureType: "audio/mpeg",
    link: `https://www.xiaoyuzhoufm.com/episode/${item.eid}`,
    pubDate: new Date(item.pubDate),
    description: item.shownotes,
    itunesItemImage: (item.image || item.podcast?.image)?.middlePicUrl,
    isPrivateMedia: item.isPrivateMedia ?? false,
  }))

  const podcast = {
    title: pageData.props.pageProps.podcast.title,
    link,
    itunesAuthor: pageData.props.pageProps.podcast.author,
    itunesCategory: "",
    image: pageData.props.pageProps.podcast.image.middlePicUrl,
    description: pageData.props.pageProps.podcast.description,
  }

  const feed = new rss({
    title: podcast.title,
    description: podcast.description ?? undefined,
    feed_url: `${_req.nextUrl.origin}/rss/xyz/${params.id}`, // Use request origin instead of SELF_URL
    site_url: link,
    generator: "Podwise",
    image_url: podcast.image ?? undefined,
    pubDate: episodes[0].pubDate,
    ttl: 3600,
    custom_namespaces: {
      itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd",
    },
    custom_elements: [
      { "itunes:author": podcast.itunesAuthor ?? undefined },
      { "itunes:image": { _attr: { href: podcast.image ?? undefined } } },
      { "itunes:subtitle": podcast.description ?? undefined },
      { "itunes:summary": podcast.description ?? undefined },
    ],
  })

  episodes.forEach((episode) => {
    if (episode.isPrivateMedia) {
      return
    }
    feed.item({
      title: episode.title,
      description: episode.description,
      url: episode.link,
      date: episode.pubDate,
      enclosure: {
        url: episode.enclosureUrl,
        type: episode.enclosureType,
      },
      custom_elements: [
        { "itunes:duration": episode.itunesDuration },
        { "itunes:image": { _attr: { href: episode.itunesItemImage ?? undefined } } },
      ],
    })
  })

  return new Response(feed.xml({ indent: true }), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  })
}


