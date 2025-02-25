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
        function addUniquePolygons(
            existingPolygons: number[][][],
            newPolygons: number[][][]
        ): number[][][] {
            const corners = (polygon: number[][]) =>
                polygon.map((inner) => inner[2]).join(",")

            // Create a Set of existing serialized polygons
            let existingSet = new Set(existingPolygons.map(polygon => corners(polygon).concat(`,${corners(polygon)}`)));
            existingSet = existingSet.union(new Set(existingPolygons.map(polygon => corners(polygon.slice().reverse()).concat(`,${corners(polygon.slice().reverse())}`))))

            //console.log(existingSet)
            // Add new polygons if they are not already in the set
            newPolygons.forEach((polygon) => {
                const newCorners = corners(polygon);
                if (!existingSet.values().some(item => {
                    //console.log(`${item}, ${newCorners}: ${item.includes(newCorners)}`)
                    return item.includes(newCorners)
                })) {
                    existingPolygons.push(polygon);
                    //console.log(`Polygon: ${newCorners.concat(`,${newCorners}`)}, reverse: ${corners(polygon.slice().reverse()).concat(`,${corners(polygon.slice().reverse())}`)}`)
                    existingSet.add(newCorners.concat(`,${newCorners}`));
                    existingSet.add(corners(polygon.slice().reverse()).concat(`,${corners(polygon.slice().reverse())}`))
                }
            });

            return existingPolygons;
        }

        function createWorker(high: number) {
            return new Promise<number[][][]>(function(resolve, reject) {
                const worker = new Worker("worker.js")
                worker.addEventListener("message", function (message: {data: number[][][]}) {
                    resolve(message.data)
                })
                worker.addEventListener("error", reject)
                worker.postMessage({
                    sum: sum,
                    sides: sides,
                    high: high
                })
            })
        }

        const startTime = performance.now()
        const promises = []
        for (let high = sum - 3; high >= sides * 2; high--) {
            promises.push(createWorker(high))
        }

        Promise.all(promises).then(function(data) {
            //console.log(data)
            setPolygons(data.reduce((acc, value) => {return addUniquePolygons(acc, value)}, [] as number[][][]))
            const endTime = performance.now()
            setTime(endTime - startTime)
        }).catch(() => {
            setPolygons([])
            const endTime = performance.now()
            setTime(endTime - startTime)
        })
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
                    //console.warn(poly)
                    return <div key={index} id={index.toString()}>
                        <svg viewBox={`0 0 350 350`} className={`w-[350px] h-[350px]`}>
                            <polygon points={polygon().join(" ")} stroke={"black"} fill={"none"}/>
                        </svg>
                        {generatePoints(polygon(), index).map((value, index) => {
                            const sideIndex = Math.floor((index) / 2)
                            const vertexIndex = (index % 2)

                            if (sideIndex >= poly.length || !poly[sideIndex]) {
                                //console.warn("Index out of bounds for poly:", {poly, sideIndex});
                                return null; // Skip rendering this element
                            }

                            //console.log(`${sideIndex}, ${vertexIndex}, ${poly[sideIndex][vertexIndex]}`)

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
