package me.cartergrove.gifclipper.domain.gif

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface GifRepository : JpaRepository<Gif, UUID> {

    @Query("SELECT g FROM Gif g WHERE g.id = :id AND g.deletedAt IS NULL")
    fun findActiveById(id: UUID): Gif?

    @Query("SELECT g FROM Gif g WHERE g.id = :id AND g.deletedAt IS NULL AND (g.expiresAt IS NULL OR g.expiresAt > CURRENT_TIMESTAMP)")
    fun findActiveAndNotExpiredById(id: UUID): Gif?

    @Modifying
    @Query("UPDATE Gif g SET g.viewCount = g.viewCount + 1 WHERE g.id = :id")
    fun incrementViewCount(id: UUID)
}
