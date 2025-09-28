"use client"

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, Edges, Outlines } from "@react-three/drei";
import { EffectComposer, Outline, Select } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useMemo } from 'react';


function Tetrahedron({points}: {points: number[]}) {
    const meshRef = React.useRef<THREE.Mesh>(null!); 

    const vertexPositions = useMemo(() => {
        // Create a tetrahedron geometry to extract vertex positions
        const geometry = new THREE.TetrahedronGeometry(2, 0);
        const positions = geometry.getAttribute('position');
        const uniqueVertices = new Set<String>();
        const midpoints = new Set<String>();

        // Collect unique vertices (there are only 4 in a basic tetrahedron)
        for (let i = 0; i < positions.count; i++) {
            const vertex = new THREE.Vector3().fromBufferAttribute(positions, i);
            uniqueVertices.add(vertex.toArray().toString()); // Use string to ensure uniqueness
        }

        const uniqueVerticesArray = Array.from(uniqueVertices).map((str: String) => {
            const [x, y, z] = str.split(',').map(Number);
            return new THREE.Vector3(x, y, z);
        });

        for (let i = 0; i < uniqueVerticesArray.length; i++) {
            for (let j = i + 1; j < uniqueVerticesArray.length; j++) {
                const v1 = uniqueVerticesArray[i];
                const v2 = uniqueVerticesArray[j];
                const midpoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
                midpoints.add(midpoint.toArray().toString());
            }
        }

        const edgeMidpoints = Array.from(midpoints).map(str => {
            const [x, y, z] = str.split(',').map(Number);
            return new THREE.Vector3(x, y, z);
        });

        // Convert back to Vector3s
        return uniqueVerticesArray.concat(edgeMidpoints)
    }, []);

    return (
        <group>
            <mesh>
                <Edges color={"black"}/>
                <tetrahedronGeometry args={[2, 0]} />
                <meshStandardMaterial color={"white"} />
            </mesh>
            {vertexPositions.map((pos, idx) => (
                <group key={idx} position={pos}>
                    <mesh>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshStandardMaterial color={"white"} />
                        <Outlines thickness={1} color={"black"}/>
                    </mesh>
                    <Billboard
                        follow={true}
                        lockX={false}
                        lockY={false}
                        lockZ={false}
                    >
                        <Text
                            position={[0, 0, 0.2]} // Slightly in front of the sphere
                            fontSize={0.3}
                            color="black"
                            anchorX="center"
                            anchorY="middle"
                            outlineColor="black"
                            outlineWidth={0.00}
                        >
                            {points[idx]}
                        </Text>
                    </Billboard>
                </group>
            ))}
        </group>
    );
}

export default function Home() {
    const [dimensions, setDimensions] = React.useState(2)
    const [sides, setSides] = React.useState(3);
    const [polygonsPerVertex, setPolygonsPerVertex] = React.useState(3)
    const [sum, setSum] = React.useState(9);
    const [polygons, setPolygons] = React.useState<number[][][]>([])
    const [time, setTime] = React.useState(0)
    const [vertices, setVertices] = React.useState<number[][]>([])

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

    function findSmallestArray(arr: number[]) {
        const length = arr.length
        const doubled = arr.concat(arr)
        const reverse = doubled.toReversed()

        const forwardStartIndex = doubled.indexOf(Math.min(...doubled))
        const reverseStartIndex = reverse.indexOf(Math.min(...reverse))

        if (doubled[forwardStartIndex + 1] < reverse[reverseStartIndex + 1]) {
            return doubled.slice(forwardStartIndex, forwardStartIndex + length)
        } else {
            return reverse.slice(reverseStartIndex, reverseStartIndex + length)
        }
    }

    React.useEffect(() => {
        function addUniquePolygons(
            existingPolygons: number[][][],
            newPolygons: number[][][]
        ): number[][][] {
            const corners = (polygon: number[][]) =>
                findSmallestArray(polygon.map((inner) => inner[2])).join(",")

            // Create a Set of existing serialized polygons
            const existingSet = new Set(existingPolygons.map(polygon => corners(polygon)));

            //console.log(existingSet)
            // Add new polygons if they are not already in the set
            newPolygons.forEach((polygon) => {
                const newCorners = corners(polygon);
                if (!existingSet.values().some(item => {
                    //console.log(`${item}, ${newCorners}: ${item.includes(newCorners)}`)
                    return item === newCorners
                })) {
                    existingPolygons.push(polygon);
                    //console.log(`Polygon: ${newCorners.concat(`,${newCorners}`)}, reverse: ${corners(polygon.slice().reverse()).concat(`,${corners(polygon.slice().reverse())}`)}`)
                    existingSet.add(newCorners);
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
                    dimensions: dimensions,
                    sum: sum,
                    sides: sides,
                    polygonsPerVertex: polygonsPerVertex,
                    high: high
                })
            })
        }

        function create3DWorker(start: number) {
            return new Promise<number[][]>(function(resolve, reject) {
                const worker = new Worker("worker.js")
                worker.addEventListener("message", function (message: {data: number[][]}) {
                    resolve(message.data)
                })
                worker.addEventListener("error", reject)
                worker.postMessage({
                    dimensions: dimensions,
                    sum: sum,
                    sides: sides,
                    polygonsPerVertex: polygonsPerVertex,
                    high: start
                })
            })
        }

        function is3DArray(data: number[][] | number[][][]): data is number[][][] {
            return Array.isArray(data[0]) && Array.isArray(data[0][0]);
        }

        const startTime = performance.now()
        const promises = []
        if (dimensions === 2) {
            for (let high = sum - 3; high >= sides * 2; high--) {
                promises.push(createWorker(high))
            }
        } else {
            for (let i = 1; i <= sum/2; i++) {
                promises.push(create3DWorker(i))
            }
        }

        Promise.all(promises).then(function(data) {
            console.log(data)
            if (is3DArray(data[0])) {
                setPolygons((data as number[][][][]).reduce((acc, value) => {return addUniquePolygons(acc, value)}, [] as number[][][]))
            } else {
                setVertices(Array.from((data as number[][][]).reduce((acc, value) => {return acc.union(new Set(value))}, new Set<number[]>())))
            }
            
            const endTime = performance.now()
            setTime(endTime - startTime)
        }).catch(() => {
            setPolygons([])
            const endTime = performance.now()
            setTime(endTime - startTime)
        })
    }, [sum, sides, dimensions, polygonsPerVertex])

    return (
        <div>
            <label>Dimensions:</label>
            <select className={"ml-2 px-2 py-0.5 bg-white mr-6 border border-black"} value={dimensions} onChange={e => setDimensions(parseInt(e.currentTarget.value))}>
                <option>2</option>
                <option>3</option>
            </select>
            {dimensions==2 ? <>
                        <label>Sides:</label>
                <input className={"ml-2 px-1 mr-6 border border-black"} value={sides} type={"number"} onInput={event => setSides(+event.currentTarget.value)}/>
            </>: <>
                <label>Shape:</label>
                <select className={"ml-2 px-1 py-0.5 bg-white mr-6 border border-black"} value={`${sides},${polygonsPerVertex}`} onChange={e => {
                    const sides = e.currentTarget.value.split(",")[0]
                    const polygons = e.currentTarget.value.split(",")[1]
                    setSides(parseInt(sides))
                    setPolygonsPerVertex(parseInt(polygons))
                }}>
                    <option value={"3,3"}>Tetrahedron</option>
                </select>
            </>}
            <label>Sum:</label>
            <input className={"ml-2 px-1 mr-6 border border-black"} value={sum} type={"number"} onInput={event => setSum(+event.currentTarget.value)}/>
            <div>
                Polygons: Found {dimensions === 2 ? polygons.length : vertices.length} in {time.toFixed(2)} milliseconds
            </div>
            {dimensions === 2 ? <div className={"flex flex-wrap"}>
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
            </div>: <div className={"flex flex-wrap"}>
                {vertices.map((vert, index) => {
                    let points = Array.from(vert)
                    for (let i = 0; i < vert.length; i++){
                        for (let j = i+1; j < vert.length; j++) {
                            points.push(sum - points[i] - points[j])
                        }
                    }
                    return <div key={index} className="aspect-square" style={{"border": "1px", "borderStyle": "outset", "borderColor": "black", "width": "25%"}}>
                        <Canvas >
                            <OrbitControls />
                            <ambientLight intensity={5} />
                            <pointLight position={[10, 10, 10]} />
                            <Tetrahedron points={points}></Tetrahedron>
                        </Canvas>
                    </div>
                })}
            </div>}
        </div>
    );
}
