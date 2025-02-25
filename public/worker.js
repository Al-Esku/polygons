function findLoops(lists, sum, sides) {
    //console.log(lists.toString())
    if (lists.length === sides) {
        //console.log("hi")
        const loop = reorderListsToFormLoop(lists)
        //console.log(`${loop} for lists ${lists}`)
        return loop.length !== 0 ? [loop]: []
    } else {
        const frequencyMap = new Map()
        for (let i = 0; i < lists.length; i++) {
            for (const num of lists[i]) {
                const indices = frequencyMap.get(num) || []
                frequencyMap.set(num, [...indices, i]);
            }
        }

        if (!lists.every(list => partialListIsValid(list, frequencyMap))) {
            //console.log(`${lists} with frequency map ${JSON.stringify(Array.from(frequencyMap))} is invalid`)
            return []
        }

        let loops = []
        for (let i = 1; i < 3; i++) {
            findSums(lists[lists.length - 1][i], sum).forEach(option => {
                loops = loops.concat(findLoops([...lists, option], sum, sides))
            })
        }
        return loops
    }
}

function partialListIsValid(list, frequencyMap) {
    let duplicates = 0
    let valid = true
    for (const num of list) {
        const indexes = frequencyMap.get(num)
        if (indexes.length === 2) {
            duplicates++
        } else if (indexes.length >= 3) {
            //console.log(`${list} with frequency map ${JSON.stringify(Array.from(frequencyMap))} is invalid: Too many indexes`)
            valid = false
        }
        for (let i = 0; i < indexes.length - 1; i++) {
            if (Math.abs(indexes[i] - indexes[i+1]) !== 1 && indexes[i+1] !== list.length - 1) {
                //console.log(`${list} with frequency map ${JSON.stringify(Array.from(frequencyMap))} is invalid: Non-looping indexes`)
                valid = false
            }
        }
    }
    return list.length === 3 && valid && (duplicates <= 2)
}

function listIsValid(list, frequencyMap) {
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

function normalizeList(list, frequencyMap, last) {
    const normalizedList = []
    if (last === 0) {
        const first = list.find((num) => {
            return frequencyMap.get(num).length === 2
        }) || -1
        normalizedList.push(first)
        const middle = list.find((num) => {
            return frequencyMap.get(num).length === 1
        }) || -1
        normalizedList.push(middle)
        const newLast = list.findLast((num) => {
            return frequencyMap.get(num).length === 2
        }) || -1
        normalizedList.push(newLast)
    } else {
        if (list.includes(last)) {
            normalizedList.push(last)
            const middle = list.find((num) => {
                return frequencyMap.get(num).length === 1
            }) || -1
            normalizedList.push(middle)
            const newLast = list.findLast((num) => {
                return frequencyMap.get(num).length === 2 && num !== last
            }) || -1
            normalizedList.push(newLast)
        }
    }
    return normalizedList
}

function containsIdenticalList(
    listOfLists,
    targetList
) {
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

function reorderListsToFormLoop(lists) {
    //console.log(`${lists} in loop`)
    const newList = []
    const frequencyMap = new Map()

    for (let i = 0; i < lists.length; i++) {
        for (const num of lists[i]) {
            const indices = frequencyMap.get(num) || []
            frequencyMap.set(num, [...indices, i]);
        }
    }

    if (!lists.every(list => listIsValid(list, frequencyMap))) {
        //console.log(`${lists} with frequency map ${JSON.stringify(Array.from(frequencyMap))} is invalid`)
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
                //console.log(`No valid index found for frequency map ${frequencyMap.get(last)} with index ${index} for lists ${lists}`)
                return []
            }
        }
        if (containsIdenticalList(newList, list)) {
            //console.log(`${newList} already contains ${list} on lists ${lists}`)
            return []
        }
        newList.push(list)
    }
    //console.log(`${newList} is valid`)
    return newList
}

const findSums = ((num, sum) => {
    const results = []
    for (let i = 1; i < Math.floor((sum - num)/2) + 1; i++) {
        if (new Set([num, i, sum - num - i]).size === 3) {
            results.push([num, i, sum - num - i])
        }
    }
    return results
})


const generatePolygons = ((high, sum, sides) => {
    let tempPolygons = []
    const lines = findSums(high, sum)
    //console.log(lines)
    if (lines.length === 0) {
        return tempPolygons
    } else {
        for (const line of lines) {
            tempPolygons = tempPolygons.concat(findLoops([line], sum, sides))
        }
    }
    //console.log(tempPolygons)
    return tempPolygons
})

self.addEventListener("message", function(message) {
    const newPolygons = generatePolygons(message.data.high, message.data.sum, message.data.sides)
    //console.log(tempPolygons)
    self.postMessage(newPolygons)
    self.close()
})