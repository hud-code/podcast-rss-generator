import { load } from "cheerio"

export async function requestNextData<T>(url: string): Promise<
  | {
      ok: false
      status: number
      statusText: string
    }
  | {
      ok: true
      data: T
    }
> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },
      next: {
        revalidate: 3600, // This sets the ISR revalidation time to 1 hour
      },
    })

    if (!res.ok) {
      console.error(`HTTP error! status: ${res.status}`)
      return {
        ok: false,
        status: res.status,
        statusText: res.statusText,
      }
    }

    const html = await res.text()

    const $ = load(html)

    const nextDataElement = $("#__NEXT_DATA__")
    if (nextDataElement.length === 0) {
      console.error("__NEXT_DATA__ element not found")
      return {
        ok: false,
        status: 500,
        statusText: "__NEXT_DATA__ element not found",
      }
    }

    const nextDataContent = nextDataElement.contents().first().text()
    if (!nextDataContent) {
      console.error("__NEXT_DATA__ content is empty")
      return {
        ok: false,
        status: 500,
        statusText: "__NEXT_DATA__ content is empty",
      }
    }

    const pageData = JSON.parse(nextDataContent)

    console.log("Parsed page data:", JSON.stringify(pageData, null, 2))

    return {
      ok: true,
      data: pageData as T,
    }
  } catch (error) {
    console.error("Error in requestNextData:", error)
    return {
      ok: false,
      status: 500,
      statusText: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
