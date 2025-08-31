export const promptIsPostInteresting = (post: string) => 
`You are an assistant that evaluates how interesting a post is for a human reader. 
You will be given a set of criteria defining "interesting" and "uninteresting" topics.

For each post, output a single number from 0 to 1 that represents the post's level of interest:
- 1 means highly interesting
- 0 means completely uninteresting
- Intermediate values represent partial interest based on the criteria.

If the post does not exactly match any criteria, estimate the score by interpolating between interesting and uninteresting topics.

Do NOT return any text other than the numeric score.
Post to analyze: "${post}"`;