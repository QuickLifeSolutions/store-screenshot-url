# Screenshot URL Actor

This Actor serves as a practical demonstration of using an Input Schema. It takes a URL and screenshot configuration parameters as input and outputs a screenshot of the website into the Key-Value store.

## How It Works

### Input

The input should be a JSON object containing specifications for capturing the screenshot. Below are the parameters you can configure:

| Field                             | Type    | Description                                                           | Allowed Values                                                   |
| --------------------------------- | ------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `urls`                            | Array   | List of website URLs to capture                                       | One or more valid URL strings                                    |
| `waitUntil`                       | String  | Specifies when to take the screenshot based on page load state        | "load", "domcontentloaded", "networkidle2", "networkidle0"       |
| `delay`                           | Number  | Delay in milliseconds after `waitUntil` event before taking screenshot| 0 to 3,600,000                                                   |
| `viewportWidth`                   | Number  | Width of the viewport for the screenshot                              | 100 to 3840                                                      |
| `viewportHeight`                  | Number  | Height of the viewport for the screenshot                             | 100 to 4320                                                      |
| `scrollToBottom`                  | Boolean | Whether to scroll to the bottom of the page before taking a screenshot| true, false                                                      |
| `fullPage`                        | Boolean | Capture the entire page (`true`) or only the visible viewport (`false`)| true, false                                                      |
| `delayAfterScrolling`             | Number  | Delay after scrolling to the bottom before taking the screenshot      | 0 to 3,600,000                                                   |
| `waitUntilNetworkIdleAfterScroll` | Boolean | Wait for network to become idle after scrolling before screenshot     | true, false                                                      |
| `waitUntilNetworkIdleAfterScrollTimeout` | Number | Max wait time for network idle after scrolling              | 1,000 to 3,600,000                                               |

### Output

The actor outputs a screenshot of the specified website into a file named `OUTPUT` in the Key-Value store associated with the actor's run.

## Connect With Us

- **YouTube**: [Visit our channel](https://www.youtube.com/@CodeMaster-421)
- **Instagram**: [Follow us on Instagram](https://www.instagram.com/quicklifesolutionsofficial/)
- **AI Newsletter**: [Subscribe to our newsletter](https://sendfox.com/quicklifesolutions)
- **Free Consultation**: [Book a free consultation call](https://tidycal.com/quicklifesolutions/free-consultation)
- **Explore More Tools**: [Check out our Apify actors](https://apify.com/dainty_screw)

### Support

- **Discord**: [Raise a Support ticket here](https://discord.gg/2WGj2PDmHb)
- **Email**: [Contact us](mailto:codemasterdevops@gmail.com)

This Actor is an essential tool for anyone needing quick and accurate web screenshots. Perfect for testing, archiving, or content verification purposes.
