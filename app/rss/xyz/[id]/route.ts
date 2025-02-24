import type { NextRequest } from "next/server"
import rss from "rss"
import { requestNextData } from "@/app/xyz-tools"

export async function generateStaticParams() {
  return []
}

const SELF_URL = process.env.SELF_URL

interface Episode {
  eid: string
  title: string
  shownotes: string
  pubDate: string
  enclosure: {
    url: string
  }
}

interface Podcast {
  title: string
  description: string
  author: string
  image: {
    middlePicUrl: string
  }
  episodes: Episode[]
}

interface PodcastData {
  podcast: Podcast
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  console.log("Generate Xiaoyuzhou RSS for podcast id:", params.id)

  const link = `https://www.xiaoyuzhoufm.com/podcast/${params.id}`

  const res = await requestNextData<PodcastData>(link)

  if (!res.ok) {
    console.error("Error fetching podcast data:", res.status, res.statusText)
    return new Response(null, {
      status: res.status,
      statusText: res.statusText,
    })
  }

  const podcastData = res.data

  console.log("Raw podcast data:", JSON.stringify(podcastData, null, 2))

  if (!podcastData || !podcastData.podcast || !Array.isArray(podcastData.podcast.episodes)) {
    console.error("Invalid podcast data structure:", podcastData)
    return new Response("Invalid podcast data", { status: 500 })
  }

  console.log("Podcast title:", podcastData.podcast.title)
  console.log("Number of episodes:", podcastData.podcast.episodes.length)

  const feed = new rss({
    title: podcastData.podcast.title,
    description: podcastData.podcast.description || "",
    feed_url: `${SELF_URL}/rss/xyz/${params.id}`,
    site_url: link,
    image_url: podcastData.podcast.image?.middlePicUrl,
    managingEditor: podcastData.podcast.author,
    webMaster: podcastData.podcast.author,
    copyright: podcastData.podcast.author,
    language: "zh-cn",
    pubDate: podcastData.podcast.episodes.length > 0 ? new Date(podcastData.podcast.episodes[0].pubDate) : new Date(),
    ttl: 60,
  })

  podcastData.podcast.episodes.forEach((episode: Episode) => {
    feed.item({
      title: episode.title,
      description: episode.shownotes,
      url: `https://www.xiaoyuzhoufm.com/episode/${episode.eid}`,
      guid: episode.eid,
      author: podcastData.podcast.author,
      date: new Date(episode.pubDate),
      enclosure: {
        url: episode.enclosure.url,
        type: "audio/mpeg",
      },
    })
  })

  return new Response(feed.xml({ indent: true }), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  })
}



