"use client"

import React from "react";

export default function Home() {
    const [sides, setSides] = React.useState(3);
    const [sum, setSum] = React.useState(9);
    const [polygons, setPolygons] = React.useState<number[][][]>([])
    const [time, setTime] = React.useState(0)

    const points = ((radius: number) => {
        const angle = 360 / sides
        const vertexIndices = range(sides)
        const offsetDeg = 90 - ((180 - angle) / 2)
        const offset = degreesToRadians(offsetDeg)

        return vertexIndices.map((index) => {
            return {
                theta: offset + degreesToRadians(angle * index),
                r: radius
            }
        })
    })

    const polygon = (() => {
        const radius = 150

        const cy = (2 * radius + 50)/2;
        return points(radius).map(({r, theta}) => {
            return [
                cy + r * Math.cos(theta + Math.PI * 0.5),
                cy + r * Math.sin(theta + Math.PI * 0.5)
            ]
        })
    })

    const generatePoints = (polygon: number[][], index: number) => {
        const points: number[][] = [];
        const columns = Math.floor(window.screen.width / 350); // Number of polygons per row

        for (let i = 0; i < polygon.length; i++) {
            // Compute base offset for this polygon
            const xOffset = (index % columns) * 350;
            const yOffset = Math.floor(index / columns) * 350;

            // Add vertex point
            points.push([
                polygon[i][0] + xOffset,
                polygon[i][1] + yOffset,
            ]);

            // Add midpoint between vertices
            points.push([
                (polygon[i][0] + polygon[(i + 1) % polygon.length][0]) / 2 + xOffset,
                (polygon[i][1] + polygon[(i + 1) % polygon.length][1]) / 2 + yOffset,
            ]);
        }

        return points;
    };

    const degreesToRadians = ((angle: number) => {
        return (Math.PI * angle) / 180
    })

    const range = ((count: number) => {
        return Array.from(Array(count).keys())
    })



    React.useEffect(() => {
        function findLoops(lists: number[][]) {
            console.log(lists)
            if (lists.length === sides) {
                console.log("hi")
                const loop = reorderListsToFormLoop(lists)
                return loop.length !== 0 ? [loop]: []
            } else {
                const frequencyMap = new Map<number, number[]>()
                for (let i = 0; i < lists.length; i++) {
                    for (const num of lists[i]) {
                        const indices = frequencyMap.get(num) || []
                        frequencyMap.set(num, [...indices, i]);
                    }
                }

                if (!lists.every(list => partialListIsValid(list, frequencyMap))) {
                    console.log(`${lists} with frequency map ${JSON.stringify(Array.from(frequencyMap))} is invalid`)
                    return []
                }

                let loops: number[][][] = []
                for (let i = 1; i < 3; i++) {
                    findSums(lists[lists.length - 1][i]).forEach(option => {
                        loops = loops.concat(findLoops([...lists, option]))
                    })
                }
                return loops
            }
        }

        function partialListIsValid(list: number[], frequencyMap: Map<number, number[]>) {
            let duplicates = 0
            let valid = true
            for (const num of list) {
                const indexes = frequencyMap.get(num)
                if (indexes?.length === 2) {
                    duplicates++
                } else if (indexes!.length >= 3) {
                    console.log(`${list} with frequency map ${JSON.stringify(Array.from(frequencyMap))} is invalid: Too many indexes`)
                    valid = false
                }
                for (let i = 0; i < indexes!.length - 1; i++) {
                    if (Math.abs(indexes![i] - indexes![i+1]) !== 1 && indexes![i+1] !== list.length - 1) {
                        console.log(`${list} with frequency map ${JSON.stringify(Array.from(frequencyMap))} is invalid: Non-looping indexes`)
                        valid = false
                    }
                }
            }
            return list.length === 3 && valid && (duplicates <= 2)
        }

        function listIsValid(list: number[], frequencyMap: Map<number, number[]>) {
            let duplicates = 0
            let singles = 0
            for (const num of list) {
                if (frequencyMap.get(num)?.length === 2) {
                    duplicates++
                } else if (frequencyMap.get(num)?.length === 1) {
                    singles++
                }
            }
            return list.length === 3 && duplicates === 2 && singles === 1
        }

        function normalizeList(list: number[], frequencyMap: Map<number, number[]>, last: number) {
            const normalizedList = []
            if (last === 0) {
                const first = list.find((num) => {
                    return frequencyMap.get(num)!.length === 2
                }) || -1
                normalizedList.push(first)
                const middle = list.find((num) => {
                    return frequencyMap.get(num)!.length === 1
                }) || -1
                normalizedList.push(middle)
                const newLast = list.findLast((num) => {
                    return frequencyMap.get(num)!.length === 2
                }) || -1
                normalizedList.push(newLast)
            } else {
                if (list.includes(last)) {
                    normalizedList.push(last)
                    const middle = list.find((num) => {
                        return frequencyMap.get(num)!.length === 1
                    }) || -1
                    normalizedList.push(middle)
                    const newLast = list.findLast((num) => {
                        return frequencyMap.get(num)!.length === 2 && num !== last
                    }) || -1
                    normalizedList.push(newLast)
                }
            }
            return normalizedList
        }

        function containsIdenticalList(
            listOfLists: number[][],
            targetList: number[]
        ): boolean {
            // Normalize the target list by sorting its elements
            const sortedTarget = [...targetList].sort((a, b) => a - b);

            // Check each list in the list of lists
            return listOfLists.some((list) => {
                // Normalize the current list by sorting its elements
                const sortedList = [...list].sort((a, b) => a - b);
                // Compare the normalized list with the normalized target
                return sortedList.length === sortedTarget.length &&
                    sortedList.every((value, index) => value === sortedTarget[index]);
            });
        }

        function reorderListsToFormLoop(lists: number[][]): number[][] {
            const newList = []
            const frequencyMap = new Map<number, number[]>()

            for (let i = 0; i < lists.length; i++) {
                for (const num of lists[i]) {
                    const indices = frequencyMap.get(num) || []
                    frequencyMap.set(num, [...indices, i]);
                }
            }

            if (!lists.every(list => listIsValid(list, frequencyMap))) {
                console.log(`${lists} with frequency map ${JSON.stringify(Array.from(frequencyMap))} is invalid`)
                return []
            }

            let index = 0
            let last = 0
            while (newList.length < lists.length) {
                const list = normalizeList(lists[index], frequencyMap, last)
                if (list.length === 3 && list.every((num) => {
                    return num > 0
                })) {
                    last = list[2]
                    const newIndex = frequencyMap.get(last)?.find((num) => {
                        return num !== index
                    })
                    if (newIndex !== undefined) {
                        index = newIndex
                    } else {
                        console.log(`No valid index found for frequency map ${frequencyMap.get(last)} with index ${index}`)
                        return []
                    }
                }
                if (containsIdenticalList(newList, list)) {
                    console.log(`${newList} already contains ${list}`)
                    return []
                }
                newList.push(list)
            }
            console.log(`${newList} is valid`)
            return newList
        }

        const findSums = ((num: number) => {
            const results = []
            for (let i = 1; i < Math.floor((sum - num)/2) + 1; i++) {
                if (new Set([num, i, sum - num - i]).size === 3) {
                    results.push([num, i, sum - num - i])
                }
            }
            return results
        })

        function addUniquePolygons(
            existingPolygons: number[][][],
            newPolygons: number[][][]
        ): number[][][] {
            const corners = (polygon: number[][]) =>
                polygon.map((inner) => inner[2]).sort()

            // Create a Set of existing serialized polygons
            const existingSet = new Set(existingPolygons.map(corners));

            // Add new polygons if they are not already in the set
            newPolygons.forEach((polygon) => {
                const newCorners = corners(polygon);
                if (!existingSet.values().some(item => {
                    return item.every((value, index) => {
                        return value === newCorners[index]
                    })
                })) {
                    existingPolygons.push(polygon);
                    existingSet.add(newCorners);
                }
            });

            return existingPolygons;
        }

        const generatePolygons = ((high: number) => {
            let tempPolygons: number[][][] = []
            const lines = findSums(high)
            console.log(lines)
            if (lines.length === 0) {
                return tempPolygons
            } else {
                for (const line of lines) {
                    tempPolygons = tempPolygons.concat(findLoops([line]))
                }
            }
            return tempPolygons
        })

        const startTime = performance.now()
        let tempPolygons: number[][][] = []
        let high = sum - 3
        while (high > Math.floor(sum / 3)) {
            const newPolygons = generatePolygons(high)
            tempPolygons = addUniquePolygons(tempPolygons, newPolygons)
            high--
        }
        console.log(tempPolygons)
        setPolygons(tempPolygons)
        const endTime = performance.now()
        setTime(endTime - startTime)
    }, [sum, sides])

    return (
        <div>
            <label>Sides:</label>
            <input className={"ml-2 px-1 mr-6 border border-black"} value={sides} type={"number"} onInput={event => setSides(+event.currentTarget.value)}/>
            <label>Sum:</label>
            <input className={"ml-2 px-1 mr-6 border border-black"} value={sum} type={"number"} onInput={event => setSum(+event.currentTarget.value)}/>
            <div>
                Polygons: Found {polygons.length} in {time.toFixed(2)} milliseconds
            </div>
            <div className={"flex flex-wrap"}>
                {polygons.map((poly, index) => {
                    console.warn(poly)
                    return <div key={index} id={index.toString()}>
                        <svg viewBox={`0 0 350 350`} className={`w-[350px] h-[350px]`}>
                            <polygon points={polygon().join(" ")} stroke={"black"} fill={"none"}/>
                        </svg>
                        {generatePoints(polygon(), index).map((value, index) => {
                            const sideIndex = Math.floor((index) / 2)
                            const vertexIndex = (index % 2)

                            if (sideIndex >= poly.length || !poly[sideIndex]) {
                                console.warn("Index out of bounds for poly:", {poly, sideIndex});
                                return null; // Skip rendering this element
                            }

                            console.log(`${sideIndex}, ${vertexIndex}, ${poly[sideIndex][vertexIndex]}`)

                            return <div key={index}
                                        style={{
                                            left: +value.toString().split(",")[0],
                                            top: +value.toString().split(",")[1]
                                        }}
                                        className={"absolute -translate-x-1/2 translate-y-[130%] px-1 bg-white border-black border"}>{poly[sideIndex][vertexIndex]}</div>
                        })}
                    </div>
                })}
            </div>
        </div>
    );
}
