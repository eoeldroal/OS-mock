#!/bin/bash

echo "======================================"
echo "Verifying all test scripts"
echo "======================================"
echo ""

cd /sessions/sharp-clever-thompson/mnt/CoWork

# Ensure core is built
echo "Building core package..."
npm run build:core > /dev/null 2>&1
echo "✓ Core built"
echo ""

# Run main test
echo "Running full task tests..."
if node round6-test-full.mjs > /tmp/test1.log 2>&1; then
    PASS_COUNT=$(grep "passed" /tmp/test1.log | grep "4/4")
    if [ ! -z "$PASS_COUNT" ]; then
        echo "✓ All 4 tasks pass"
    else
        echo "✗ Task test failed"
        cat /tmp/test1.log | tail -20
        exit 1
    fi
else
    echo "✗ Task test crashed"
    cat /tmp/test1.log | tail -20
    exit 1
fi
echo ""

# Run command test
echo "Running terminal command tests..."
if node round6-test-commands.mjs > /tmp/test2.log 2>&1; then
    echo "✓ All 6 commands work"
else
    echo "✗ Command test failed"
    cat /tmp/test2.log | tail -20
    exit 1
fi
echo ""

# Run seed test
echo "Running multi-seed tests..."
if node round6-test-seeds-fixed.mjs > /tmp/test3.log 2>&1; then
    PASS_COUNT=$(grep "passed" /tmp/test3.log | grep "6/6")
    if [ ! -z "$PASS_COUNT" ]; then
        echo "✓ All 6 seed tests pass"
    else
        echo "✗ Seed test failed"
        cat /tmp/test3.log | tail -20
        exit 1
    fi
else
    echo "✗ Seed test crashed"
    cat /tmp/test3.log | tail -20
    exit 1
fi
echo ""

echo "======================================"
echo "✓ All verification tests passed!"
echo "======================================"
exit 0
