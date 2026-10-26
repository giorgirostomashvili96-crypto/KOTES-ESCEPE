extends Area2D
class_name Obstacle

enum ObstacleKind { BARREL, HAY_BALE, ROCK, FENCE, CRATE }

@export var kind: ObstacleKind = ObstacleKind.BARREL
@export var requires_slide: bool = false
var passed: bool = false

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node2D) -> void:
	if body is Player:
		var p := body as Player
		if requires_slide and p.is_sliding:
			p.near_miss_triggered.emit(global_position)
		else:
			p.hit_obstacle.emit(self)

func _draw() -> void:
	match kind:
		ObstacleKind.BARREL:
			# Georgian wine barrel
			draw_rect(Rect2(-20, -26, 40, 52), Color("#78350F"), true)
			draw_line(Vector2(-20, -14), Vector2(20, -14), Color("#1F2937"), 4.0)
			draw_line(Vector2(-20, 14), Vector2(20, 14), Color("#1F2937"), 4.0)
			draw_circle(Vector2(0, 0), 3.0, Color("#F59E0B")) # Brass tap
		ObstacleKind.HAY_BALE:
			# Golden hay bale
			draw_rect(Rect2(-28, -22, 56, 44), Color("#EAB308"), true)
			draw_line(Vector2(-12, -22), Vector2(-12, 22), Color("#713F12"), 2.0)
			draw_line(Vector2(12, -22), Vector2(12, 22), Color("#713F12"), 2.0)
		ObstacleKind.ROCK:
			# Mountain granite
			var rock_pts = PackedVector2Array([
				Vector2(-24, 20), Vector2(-20, -10), Vector2(0, -22),
				Vector2(22, -8), Vector2(24, 20)
			])
			draw_colored_polygon(rock_pts, Color("#57534E"))
		ObstacleKind.FENCE:
			# Wooden village fence
			for i in range(4):
				var px = -24 + i * 16
				draw_rect(Rect2(px, -28, 10, 56), Color("#B45309"), true)
			draw_rect(Rect2(-26, -14, 52, 6), Color("#78350F"), true)
			draw_rect(Rect2(-26, 12, 52, 6), Color("#78350F"), true)
		ObstacleKind.CRATE:
			# Freight crate
			draw_rect(Rect2(-22, -22, 44, 44), Color("#D97706"), true)
			draw_rect(Rect2(-20, -20, 40, 40), Color("#78350F"), false, 3.0)
			draw_line(Vector2(-20, -20), Vector2(20, 20), Color("#78350F"), 2.0)
			draw_line(Vector2(20, -20), Vector2(-20, 20), Color("#78350F"), 2.0)
